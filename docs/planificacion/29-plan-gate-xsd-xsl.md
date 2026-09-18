# 29 — Plan: gate local/CI XSD + XSL (+ Excel)

Plan para un **harness de validación** que use los artefactos oficiales en  
`docs/sunat-oficial/04-esquemas-validacion/`  
antes de firmar/enviar. Cierra el hueco “XSD presentes pero sin gate CI” de [25-auditoria](25-auditoria-cobertura-sunat.md). Relación directa con **Spike B** en [24-plan-spikes-emision.md](24-plan-spikes-emision.md).

**No implementa el motor aquí** — define etapas, prioridades y criterio de fallo API (`FACTOSYS_VALIDATION`).

---

## 1. Objetivo

| Meta | Detalle |
| --- | --- |
| Desarrollador | `pnpm validate:xml --type=01 path.xml` falla en local como fallaría SUNAT en capa esquema |
| CI | PR que rompa Invoice XSD no mergea |
| Runtime API | Pre-validación en emisión: mismo harness (o subset) → error estable antes de correlativo/wire según ADR-001 |

Capas SUNAT (recordatorio [01-mapa](01-mapa-oficial-sunat.md) §6):

1. **XSD** — XML UBL bien tipado  
2. **XSL / Excel** — reglas de negocio peruanas  
3. **CDR** — verdicto final SUNAT  

El gate cubre (1) y, en MVP, **prioriza Excel sobre XSL** para (2).

---

## 2. Insumos oficiales (fuente de verdad)

Ubicación: `docs/sunat-oficial/04-esquemas-validacion/`

| Archivo | Uso en el gate |
| --- | --- |
| `xsd-ubl.zip` | Esquemas XSD UBL CPE (Invoice, CreditNote, DebitNote, …) |
| `xsl-ubl-2.1-2022-09-06.zip` | Transformaciones/reglas XSL 2.1 (opcional MVP) |
| `xsl-ubl-2.0.zip` / `xsl.zip` | RA/RC (UBL 2.0) y paquetes auxiliares |
| `reglas-validacion-cpe-2026-08-26.xlsx` | **Motor de reglas MVP** (hojas por tipo + CódigosRetorno) |
| `listado-observaciones-migran-a-error.xlsx` | Tratar OBS migradas como ERROR ([16](16-catalogo-errores.md)) |
| `reglas-validacion-gre-2026-06-20.xlsx` | Gate GRE (fase posterior a Invoice) |

Versionar en runtime: `ruleset_version: "2026-08-26"` (y fecha del zip XSD en meta).

---

## 3. Etapa 0 — Unpack once (cache)

Los ZIP **no** se descomprimen en cada test ad hoc sin control.

| Paso | Detalle |
| --- | --- |
| Trigger | Script `pnpm sunat:unpack-schemas` (post-monorepo) o preparación en PR0 |
| Destino preferido | `packages/sunat-validation/schemas/` **o** `docs/sunat-oficial/.cache/xsd-ubl/` (gitignored) |
| Política git | **No** commitear miles de XSD si pesan/ruido; sí commitear script + checksum (`SHA256` del zip) + path de cache |
| CI | Cache key = hash del zip; restore antes de test |
| Actualización SUNAT | Re-descargar zip → bump checksum → CI limpia cache → re-golden si cambia esquema |

Salida esperada tras unpack:

```
.cache/xsd-ubl/
  .../UBL-Invoice-2.1.xsd
  .../common/*.xsd
.cache/xsl-ubl-2.1/
  ...
```

(Exact paths salen del zip; el script debe documentar el XSD raíz por tipo.)

---

## 4. Etapa 1 — Validar XML **sin firma** vs XSD

| Ítem | Spec |
| --- | --- |
| Input | XML **unsigned** (builder `sunat-ubl`) o firmado con UBLExtensions; el XSD debe aceptar la forma que usemos en spike B |
| Herramienta | `libxmljs2` / xmllint / equivalente Node (evaluar en spike; [06](06-stack-tecnologico.md)) |
| Qué valida | Namespaces, estructura, cardinalidad, tipos XSD |
| Qué **no** valida | Totales IGV, catálogos, detracciones, fechas de negocio |

**Criterio Spike B ([24](24-plan-spikes-emision.md) §B.3):** chequeo **B2** = este gate para Invoice.

Fallo XSD → no seguir a firma ni SendBill.

---

## 5. Etapa 2 — XSL (opcional en MVP)

| Ítem | Spec |
| --- | --- |
| Prioridad MVP | **Baja / opcional** |
| Motivo | El Excel 2026 es más actual y ya alimenta el catálogo de códigos; duplicar XSL+Excel retrasa |
| Uso | Smoke en CI nightly: 1 Invoice pasa XSL sin error crítico |
| Binding | Misma cache unpack; runner Saxon/xslt3 u otro — **spike aparte**, no bloquea B |

Si XSL y Excel discrepan: **ganar Excel + listado OBS→ERROR**; loguear divergencia.

Detalle operativo del job: §14 **CI nightly XSL**.

---

## 6. Etapa 3 — Reglas Excel (prioridad MVP)

Motor descrito en [16](16-catalogo-errores.md) §5:

1. Cargar `sunat-codigos-retorno.json` (+ version Excel).
2. Implementar subset de reglas por hoja, en este orden de producto:

| Prioridad | Hojas / foco | Tipos |
| --- | --- | --- |
| P0 | `Factura2_0` (o nombre vigente) + `General` + `Firma` (checks pre-firma aplicables) | 01 |
| P1 | `Boleta2_0` | 03 |
| P2 | `NotaCredito2_0` / `NotaDebito2_0` | 07 / 08 |
| P3 | Reglas RA/RC en Excel CPE | RA / RC |
| P4 | Excel GRE | 09 / 31 |

Cada violación local:

```json
{
  "code": "FACTOSYS_VALIDATION",
  "sunat_code": "2324",
  "stage": "prevalidation",
  "retryable": false,
  "details": [{ "path": "totals.igv", "issue": "…" }]
}
```

HTTP emisión: **422**.

---

## 7. Documentos en el gate v1 (orden)

| Orden | Documento | XSD | Excel | XSL | Notas |
| --- | --- | --- | --- | --- | --- |
| 1 | **Invoice 01** | Sí (CI blocking) | Subset P0 | Opcional | = Spike B |
| 2 | Boleta 03 | Sí | P1 | Opt | Tras builder boleta |
| 3 | NC 07 | Sí | P2 | Opt | |
| 4 | ND 08 | Sí | P2 | Opt | |
| 5 | RA | Sí (UBL 2.0) | P3 | Opt 2.0 | |
| 6 | RC | Sí (UBL 2.0) | P3 | Opt 2.0 | |
| 7 | GRE 09/31 | XSD GRE del paquete vigente | Excel GRE | Opt | No mezcla con Excel CPE |

**Gate v1 “mínimo CI verde”:** solo **Invoice unsigned** XSD + 3–5 reglas Excel críticas (totales, moneda, RUC, serie-número, TaxScheme).  
Ampliar tipos conforme existan builders.

---

## 8. Fallo = `FACTOSYS_VALIDATION`

| Capa gate | `code` | `sunat_code` | Notas |
| --- | --- | --- | --- |
| XML mal formado | `FACTOSYS_VALIDATION` | opcional genérico / omitir | `details` con línea parser |
| XSD | `FACTOSYS_VALIDATION` | si hay código SUNAT asociado úsalo; si no, `details` XSD | `stage=prevalidation` |
| Excel | `FACTOSYS_VALIDATION` | **código oficial de la regla** | Alineado a CDR futuro |
| XSL (si activo) | igual | mapear si el XSL emite código | |

Tras pasar gate y fallar CDR → `FACTOSYS_SUNAT_REJECTED` (no VALIDATION).  
Eso diferencia “lo atrapamos nosotros” vs “SUNAT rechazó”.

---

## 9. Relación con Spike B ([24](24-plan-spikes-emision.md))

```
Spike B.1 build Invoice unsigned
    → Gate Etapa 1 (XSD)     == B2
    → Golden diff            == B3
Spike A sign
    → (opcional) re-validar XSD firmado
Spike C SendBill
    → Solo si B2 verde
```

| Entrega Spike B | Entrega Gate (este plan) |
| --- | --- |
| Un test XSD en el paquete `sunat-ubl` | Package `sunat-validation` reusable + script CI |
| Fixture gravada | Misma fixture como caso canónico del gate |
| Go/No-go B2 | Gate Invoice blocking en CI = formalización de B2 |

**Orden recomendado:** durante Spike B, el XSD check puede vivir *inline* en `sunat-ubl/testdata`. Al cerrar B, **extraer** a `sunat-validation` y dejar que B solo llame al port `validateXml({ type:'01', xml })`.

Excel P0 **no** es obligatorio para declarar Spike B “go” (B se contenta con XSD+golden+firma); sí es obligatorio antes de API emisión productiva (`local-rules` en [21](21-fixtures-sandbox.md) / [22](22-sandbox-setup.md)).

---

## 10. Integración CI / local

### Local

```text
pnpm sunat:unpack-schemas
pnpm --filter sunat-validation test
pnpm validate:xml --type=01 packages/sunat-ubl/testdata/golden/01-invoice-gravada.unsigned.xml
```

### CI (GitHub Actions, esbozo)

1. Checkout  
2. Cache unpack por hash zip  
3. `unpack-schemas`  
4. Unit tests validation  
5. Validar goldens unsigned (01 primero)  
6. (Nightly) muestra XSL — ver §14 y [31](31-ci-quality-gates.md)

Fallar el **job PR** si XSD≠0 errors (XSL nightly = warn en MVP).

### Runtime API

Mismo port en application layer `ValidateCanonicalDocument` / `ValidateXml` **antes** de `sign` (y según política de correlativos, antes o después de reservar — ver ADR-001: preferible validar **antes** de wire; reserva según flujo actual).

---

## 11. Port propuesto (contrato, no código)

```ts
interface SunatValidationPort {
  validateXml(input: {
    documentType: '01' | '03' | '07' | '08' | 'RA' | 'RC' | '09' | '31';
    xml: string;
    stages?: Array<'xsd' | 'excel' | 'xsl'>;
  }): Promise<{
    ok: boolean;
    rulesetVersion: string;
    issues: Array<{
      stage: 'xsd' | 'excel' | 'xsl';
      sunatCode?: string;
      message: string;
      path?: string;
    }>;
  }>;
}
```

Default MVP `stages: ['xsd', 'excel']`.

---

## 12. Criterios de aceptación del plan (cuando se implemente)

- [ ] Unpack reproducible + checksum del `xsd-ubl.zip` documentado.
- [ ] CI blocking: golden Invoice unsigned pasa XSD.
- [ ] XML Invoice deliberadamente roto (tag faltante) → fallo XSD en CI.
- [ ] ≥1 regla Excel (ej. total≠suma) → `FACTOSYS_VALIDATION` + `sunat_code` del Excel.
- [ ] Spike B B2 usa el mismo validador XSD (o wrapper fino).
- [ ] `ruleset_version` expuesto en error y en `GET /meta/ruleset` (cuando exista).
- [ ] GRE/RA/RC: tickets abiertos, no bloquean merge del gate Invoice.

---

## 13. Fuera de alcance de este plan

- Reimplementar los 2077 códigos como mensajes marketing.
- Homologación OSE / validador certificado.
- Sustituir CDR.
- Parser completo de todas las hojas Excel el día 1 (solo subset P0–P2 según §7).

---

## 14. CI nightly XSL

Job **aparte** del gate PR. No bloquea merge del MVP Excel-first. Resumen de gates: [31-ci-quality-gates.md](31-ci-quality-gates.md).

### 14.1 Schedule

| Ítem | Valor |
| --- | --- |
| Trigger | `schedule` cron (sugerido: `0 6 * * *` UTC ≈ 01:00 PET) + `workflow_dispatch` |
| Runner | GitHub Actions (mismo cache unpack que PR) |
| Branch | `main` (o default) |
| Timeout | ~15–20 min |

### 14.2 Qué XSL / de qué ZIP

Fuente: `docs/sunat-oficial/04-esquemas-validacion/`.

| Prioridad nightly | ZIP | XSL | Documento |
| --- | --- | --- | --- |
| P0 (obligatorio smoke) | `xsl-ubl-2.1-2022-09-06.zip` | `validaciones/ValidaExprRegFactura-2.0.1.xsl` | Invoice 01 |
| P1 (cuando exista golden) | mismo zip | `ValidaExprRegBoleta-2.0.1.xsl` | Boleta 03 |
| P1 | mismo zip | `ValidaExprRegNC-2.0.1.xsl` / `ValidaExprRegND-2.0.1.xsl` | 07 / 08 |
| P2 | `xsl-ubl-2.0.zip` | `ValidaExprRegSummary-1.1.0.xsl`, `ValidaExprRegOtrosVoided-1.0.1.xsl` | RC / RA |
| P2 (GRE) | `xsl.zip` | `ValidaExprRegGreRemitente-2.0.1.xsl`, `ValidaExprRegGreTransportista-2.0.1.xsl` | 09 / 31 |

Unpack a `.cache/xsl-ubl-2.1/` (y siblings); checksum del zip en CI cache key.

### 14.3 Goldens

| Golden | Path esperado (post Spike B) | Nightly |
| --- | --- | --- |
| Invoice gravada unsigned | `packages/sunat-ubl/testdata/golden/01-invoice-gravada.unsigned.xml` (o fixture → XML del builder) | **Sí** — caso canónico |
| Invoice firmada (opcional) | mismo + firma Spike A | Solo si XSL exige UBLExtensions/firma |
| Negativo control | XML con total roto / tag faltante | Opcional: assert XSL **falla** (smoke de runner) |

No mezclar goldens GRE hasta que el builder DespatchAdvice esté estable.

### 14.4 Fallo: warn vs block

| Severidad | Cuándo | Efecto CI |
| --- | --- | --- |
| **warn** (default MVP) | Fallo XSL en nightly; runner caído; divergencia XSL↔Excel | Job `continue-on-error: true` o anotación / issue bot; **no** rojo en PR |
| **block** (fase posterior) | Tras alinear XSL con Excel P0 y tener ≥2 goldens verdes 14 días | Nightly failure → rojo; aún **no** en PR salvo acuerdo explícito |
| Nunca en PR (MVP) | — | PR sigue bloqueando solo **XSD + Excel subset** (§7 / [31](31-ci-quality-gates.md)) |

Si XSL y Excel discrepan en nightly: log + artifact; **Excel gana** para runtime API (§5).

### 14.5 Relación con Excel-first MVP

```
PR gate (blocking)     → XSD Invoice + Excel P0 subset
Nightly (warn)         → XSL Factura-2.0.1 vs golden unsigned
Runtime API (MVP)      → stages: ['xsd','excel']  — sin XSL obligatorio
```

- Spike B / gate v1 **no** esperan XSL verde.
- Nightly detecta regresiones de esquema XSL o goldens “demasiado permisivos” sin frenar el MVP.
- Activar `stages: ['xsd','excel','xsl']` en API solo cuando nightly pase a **block** estable y el costo de runner sea aceptable.
