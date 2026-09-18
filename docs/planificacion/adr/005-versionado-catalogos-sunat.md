# ADR-005 — Versionado de catálogos y ruleset SUNAT

Estado: **Aceptado** (planificación)  
Fecha: 2026-09-17  
Relacionado: `01-mapa-oficial-sunat.md`, `16-catalogo-errores.md` §5, `artifacts/openapi-v1.yaml` `GET /meta/ruleset`, `26-modelo-datos-postgres.md` (`catalog_*`, `companies.catalog_pin`), monorepo `packages/sunat-catalogs`

## Contexto

FACTOSYS pre-valida antes de quemar correlativo. Los insumos cambian en el tiempo:

1. **Excel de reglas** (`reglas-validacion-cpe-YYYY-MM-DD.xlsx`) — motor de prevalidación.
2. **Anexo VII** (y catálogos de códigos asociados) — tablas código/descripción vigentes.
3. **Catálogos RS-340** (y actualizaciones posteriores referidas en normativa) — tipos de operación, tributos, etc.
4. **Códigos de retorno / observaciones** exportados a JSON (`sunat-codigos-retorno`, etc.).

Sin versionado explícito: un cambio de Excel en prod puede hacer que el mismo payload pase hoy y falle mañana, o al revés, y el integrador no puede reproducir un rechazo.

## Decisión

### 1. Tres ejes de versión (como mínimo)

| Eje | `catalog_versions.kind` | Identificador `version` | Uso |
| --- | --- | --- |
| Ruleset Excel | `ruleset_excel` | fecha ISO del archivo oficial, p.ej. `2026-08-26` | Prevalidación CPE; campo `ruleset_version` en errores y documentos |
| Anexo VII / catálogos tabulares | `anexo_vii` | tag semver o fecha publicación FACTOSYS, p.ej. `2026.09.01` | Lookup códigos válidos (doc type, identidad, unidad, …) |
| RS-340 (+ deltas) | `rs340` | igual convención fecha/tag | Catálogos de operación/tributo referenciados por guías |
| Códigos retorno | `codigos_retorno` | alineado al export JSON | Mapeo mensajes CDR / observación |
| Ubigeo (opcional) | `ubigeo` | fecha INEI/SUNAT empaquetada | Validación dirección |

Un “ruleset efectivo” de company es el **conjunto pineado**, no un solo número mágico — pero la API pública prioriza `ruleset_version` (Excel) por ser el más visible en DX.

### 2. Fuente de verdad y export a artifacts

Pipeline (humano + CI, sin producto runtime escribiendo git):

```text
docs/sunat-oficial/… (binarios oficiales, no necesariamente en git LFS forever)
        ↓ script de import (dev)
docs/planificacion/artifacts/catalogs/
        ├── ruleset/
        │     └── 2026-08-26/
        │           ├── source.sha256
        │           ├── manifest.json
        │           └── compiled/…   # reglas ejecutables (JSON/YAML), no Excel crudo si es pesado
        ├── anexo-vii/
        │     └── 2026.09.01/
        │           ├── items.jsonl  o CSV
        │           └── manifest.json
        ├── rs340/
        │     └── …/
        └── codigos-retorno/
              └── …/sunat-codigos-retorno.json
        ↓ migrate/seed
Postgres catalog_versions + catalog_items
        ↓ build
packages/sunat-catalogs (embed o carga lazy desde path configurado)
```

`manifest.json` mínimo:

```json
{
  "kind": "ruleset_excel",
  "version": "2026-08-26",
  "source_filename": "reglas-validacion-cpe-2026-08-26.xlsx",
  "source_sha256": "…",
  "imported_at": "2026-09-17T00:00:00Z",
  "breaking": false,
  "notes": "Hojas Factura2_0, Boleta2_0, …"
}
```

Regla: **ningún catálogo “implícito” solo en código**; todo valor de dominio SUNAT referenciable debe poder rastrearse a un `kind+version`.

### 3. `GET /meta/ruleset`

Público (OpenAPI: `security: []`). Respuesta MVP ampliada (compatible con campos actuales):

```json
{
  "ruleset_version": "2026-08-26",
  "source": "reglas-validacion-cpe-2026-08-26.xlsx",
  "source_sha256": "…",
  "default_for": {
    "sandbox": {
      "ruleset": "2026-08-26",
      "anexo_vii": "2026.09.01",
      "rs340": "2026.09.01",
      "codigos_retorno": "2026-08-26"
    },
    "production": {
      "ruleset": "2026-08-26",
      "anexo_vii": "2026.09.01",
      "rs340": "2026.09.01",
      "codigos_retorno": "2026-08-26"
    }
  },
  "supported": {
    "ruleset": ["2026-08-26"],
    "anexo_vii": ["2026.09.01"],
    "rs340": ["2026.09.01"]
  }
}
```

- Sin auth: refleja **defaults de plataforma**, no el pin de una company.
- Con API key (evolución permitida): query `?company_id=` puede devolver el pin efectivo de esa company.

### 4. Pin por company + environment

Cada `companies` row ya es por `environment` (`sandbox` | `production`). Columna:

```text
catalog_pin jsonb NOT NULL DEFAULT '{}'
```

Ejemplo:

```json
{
  "ruleset": "2026-08-26",
  "anexo_vii": "2026.09.01",
  "rs340": "2026.09.01",
  "codigos_retorno": "2026-08-26"
}
```

Resolución al validar/emitir:

1. Si `catalog_pin.ruleset` presente y existe en `catalog_versions` → usarlo.
2. Si no → default plataforma para ese `companies.environment`.
3. Persistir en `documents.ruleset_version` (y opcionalmente snapshot jsonb `catalog_pin_effective`) al momento de `validated`, **inmutable** después.

Sandbox puede pinear un ruleset más nuevo que production (canary de reglas). Production solo se actualiza con proceso de release.

API de pin (planificada; puede ser admin-only en MVP):

- `GET/PATCH /v1/companies/{companyId}/catalog-pin`
- Scopes: `credentials:manage` o scope admin futuro.

### 5. Comportamiento del motor

- Toda respuesta `FACTOSYS_VALIDATION` incluye `ruleset_version` (ya en esquema Error OpenAPI).
- CDR mapping usa `codigos_retorno` pineado / default.
- Lookups de catálogo (tipo doc, moneda, afectación IGV, …) usan `anexo_vii` / `rs340` pineados.
- Fixtures de sandbox (`21-fixtures-sandbox.md`) declaran el pin esperado en metadata.

### 6. Política de breaking change

| Cambio | ¿Breaking? | Acción |
| --- | --- | --- |
| Nueva regla que rechaza payloads antes aceptados | **Sí** | Nueva `version`; no mutar la versión publicada; defaults sandbox primero; production con anuncio ≥ 7 días |
| Relajar regla / bugfix positivo corregido | Menor | Puede ir en patch notes; preferible nueva versión igual |
| Nuevo código en catálogo Anexo VII | No breaking | Nueva versión catálogo; default puede avanzar en sandbox automático |
| Eliminar código catálogo | **Sí** | Nueva versión; period de convivencia (ambas versiones en `supported`) |
| Corrección de typo en description | No | In-place solo si `version` aún no fue default de production; si ya lo fue → nueva versión |

Reglas operativas:

1. **Inmutabilidad:** una vez `catalog_versions` marcada `is_default` de production o referenciada por cualquier `documents.ruleset_version`, el artifact compilado **no se reescribe**; se publica otra `version`.
2. **Convivencia:** mantener al menos las **2** últimas versions de `ruleset_excel` servibles.
3. **Sunset:** quitar una version de `supported` solo si ningún company pin la usa (job de auditoría) + aviso.
4. **Changelog:** `manifest.json` + entrada en `docs/planificacion/artifacts/catalogs/CHANGELOG.md`.
5. Errores nuevos deben conservar `sunat_code` oficial cuando la regla lo tenga; no inventar códigos inventados para ruleset.

### 7. Relación con Excel crudo

- El Excel oficial puede vivir fuera del runtime (solo import).
- Runtime carga **compiled rules** + hash del source en manifest para auditoría.
- `source` en `/meta/ruleset` nombra el archivo oficial de origen, no un path interno de servidor.

### 8. Fuera de alcance

- Diff automático hoja-a-hoja del Excel en UI.
- Que el cliente envíe `ruleset_version` arbitrario no listado en `supported` (rechazar con 400).
- Versionar XSD/XSL en este ADR (paquete aparte; puede reutilizar el mismo patrón `kind=xsd` después).

## Consecuencias

- Doc 26: tablas `catalog_versions` / `catalog_items` + `companies.catalog_pin`.
- Spike de reglas (plan 24) debe etiquetar salida con `ruleset_version=2026-08-26`.
- Integradores pueden fijar sandbox a un ruleset canary sin mover production.
- Reproducibilidad: dado `document_id`, se sabe con qué catálogos se validó.

## Alternativas descartadas

- Un solo “global latest” sin pin → roturas silenciosas en production.
- Versionar solo por semver FACTOSYS sin fecha del Excel → pierde trazabilidad con biblioteca SUNAT.
- Mutar Excel in-place en S3 → imposible auditar rechazos históricos.
