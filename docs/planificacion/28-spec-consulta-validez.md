# 28 — Spec: consulta integrada de validez CPE

Profundiza el stub OpenAPI `POST /validations/cpe` hasta un nivel **implementable**.  
Fuentes: `docs/sunat-oficial/03-manuales-tecnicos/manual-consulta-integrada-validez-cpe.pdf`, endpoints en [README sunat-oficial](../sunat-oficial/README.md), [08-api](08-api-publica-borrador.md), [16-errores](16-catalogo-errores.md), [05-arquitectura](05-arquitectura.md) (Sunat Gateway · REST validez · Bearer).

**No es un diccionario UBL.** No emite CPE; solo consulta a SUNAT (o cache) si un comprobante figura como válido / anulado / inexistente, más estado RUC.

---

## 1. Objetivo producto

Permitir al integrador (ERP, e-commerce, backoffice) validar un CPE **ajeno o propio** con los mismos datos que pide SUNAT en la consulta web/API, sin que el cliente implemente OAuth extranet ni mapee `estadoCp`.

FACTOSYS actúa como **proxy autenticado + normalizador + cache + rate limit**.

---

## 2. Endpoint FACTOSYS

| Ítem | Valor |
| --- | --- |
| Método / path | `POST /v1/validations/cpe` |
| operationId | `validateCpe` |
| Auth API | API key (organization); scope sugerido `validations:cpe` |
| Tenant | La consulta usa credenciales SUNAT de una **company** del org (ver §5) |
| Idempotency-Key | **No** requerida (lectura); opcional ignorada |

### 2.1 Request (JSON canónico FACTOSYS)

Extiende el stub OpenAPI (`CpeValidationRequest`) con tipos y reglas:

```json
{
  "company_id": "uuid",
  "ruc": "20123456789",
  "document_type": "01",
  "serie": "F001",
  "number": "12345",
  "issue_date": "2026-09-17",
  "total_amount": 159.30
}
```

| Campo FACTOSYS | Tipo | Req | Reglas | Mapeo SUNAT body |
| --- | --- | --- | --- | --- |
| `company_id` | uuid | Sí* | Company del org que aporta credenciales de consulta | Path `{RUC}` = RUC de **esta** company (consultante), **no** necesariamente el emisor |
| `ruc` | string(11) | Sí | RUC **emisor** del CPE consultado | `numRuc` |
| `document_type` | string(2) | Sí | Cat. 01: al menos `01`,`03`,`07`,`08` en MVP; otros si SUNAT los acepta | `codComp` |
| `serie` | string | Sí | Serie tal cual (ej. `F001`, `B001`) | `numeroSerie` |
| `number` | string \| number | Sí | Correlativo **sin** forzar padding en request; se envía a SUNAT como string canónico | `numero` (string) |
| `issue_date` | date ISO | Sí | `YYYY-MM-DD` en API FACTOSYS | `fechaEmision` en formato que exige el manual (**típicamente `DD/MM/YYYY`**) — convertir en el adapter |
| `total_amount` | number | Sí** | Importe total del CPE; hasta 15 enteros + 2 decimales | `monto` (**string** decimal hacia SUNAT, ej. `"159.30"`) |

\*Si la API key está amarrada a una sola company, `company_id` puede inferirse.  
\*\*Obligatorio para CPE electrónicos (regla SUNAT / gob.pe). Rechazar 422 si falta.

**Fuera de request MVP:** consulta masiva TXT (hasta 100 filas) — v2; endpoint batch aparte.

Validación local previa (antes de llamar SUNAT):

- RUC 11 dígitos + checksum básico opcional.
- `document_type` en allowlist.
- `serie` / `number` no vacíos.
- `total_amount` ≥ 0, máx. 2 decimales.
- Fallo → `FACTOSYS_VALIDATION` (`stage=request`).

### 2.2 Response (JSON canónico FACTOSYS)

Normalizar el payload SUNAT; conservar `raw` para debug (como el stub).

```json
{
  "success": true,
  "message": "…",
  "document": {
    "ruc": "20123456789",
    "document_type": "01",
    "serie": "F001",
    "number": "12345",
    "issue_date": "2026-09-17",
    "total_amount": 159.30
  },
  "cpe_status": "1",
  "cpe_status_label": "ACEPTADO",
  "ruc_status": "00",
  "ruc_status_label": "ACTIVO",
  "domicile_condition": "00",
  "domicile_condition_label": "HABIDO",
  "observations": [],
  "sunat_error_code": null,
  "cached": false,
  "checked_at": "2026-09-17T20:00:00Z",
  "raw": { }
}
```

| Campo FACTOSYS | Origen SUNAT | Notas |
| --- | --- | --- |
| `success` | `success` | bool de la operación de consulta |
| `message` | `message` | Mensaje SUNAT o sintético FACTOSYS |
| `cpe_status` | `data.estadoCp` | Stringificar siempre (`"0"`…`"4"`) |
| `cpe_status_label` | tabla §3 | Label estable en español |
| `ruc_status` | `data.estadoRuc` | |
| `ruc_status_label` | tabla §3 | |
| `domicile_condition` | `data.condDomiRuc` | |
| `domicile_condition_label` | tabla §3 | |
| `observations` | `data.observaciones` / `Observaciones` | Array de strings; normalizar casing del campo SUNAT |
| `sunat_error_code` | `errorCode` | null si OK |
| `cached` | FACTOSYS | true si respuesta de cache |
| `checked_at` | FACTOSYS | Instantánea de la consulta efectiva a SUNAT (o de cache hit) |
| `raw` | objeto completo | Solo si header `X-Factosys-Include-Raw: true` **o** siempre en sandbox; en prod default **omitir** o truncar — decisión: **incluir en sandbox / omitir en prod** salvo flag |

HTTP **200** tanto si el CPE “no existe” (`estadoCp=0`) como si está aceptado: es resultado de negocio, no error de API.  
Errores de transporte/auth → 4xx/5xx con catálogo 16 (§6).

---

## 3. Catálogos de estado (manual SUNAT)

### 3.1 `estadoCp` (comprobante)

| Código | Label FACTOSYS | Significado |
| --- | --- | --- |
| `0` | `NO_EXISTE` | No informado a SUNAT |
| `1` | `ACEPTADO` | Aceptado |
| `2` | `ANULADO` | Comunicado en baja |
| `3` | `AUTORIZADO` | Autorización de imprenta (físicos) |
| `4` | `NO_AUTORIZADO` | No autorizado por imprenta |

### 3.2 `estadoRuc` (contribuyente) — subset frecuente

| Código | Label |
| --- | --- |
| `00` | `ACTIVO` |
| `01` | `BAJA_PROVISIONAL` |
| `02` | `BAJA_PROV_POR_OFICIO` |
| `03` | `SUSPENSION_TEMPORAL` |
| `10` | `BAJA_DEFINITIVA` |
| `11` | `BAJA_DE_OFICIO` |
| `22` | `INHABILITADO_VENTA_UNICA` |

Códigos no listados: devolver código crudo + `ruc_status_label: "DESCONOCIDO"` y loggear para ampliar tabla.

### 3.3 `condDomiRuc` (condición domiciliaria) — subset

| Código | Label típico |
| --- | --- |
| `00` | `HABIDO` |
| `09` | `PENDIENTE` |
| `11` | `POR_VERIFICAR` |
| `12` | `NO_HABIDO` |
| `20` | `NO_HALLADO` |

Confirmar labels exactos contra el PDF del manual en implementación; la API debe preferir **código** estable.

---

## 4. Mapeo al servicio SUNAT

| Ítem | Valor oficial (manual / README biblioteca) |
| --- | --- |
| URL consulta | `POST https://api.sunat.gob.pe/v1/contribuyente/contribuyentes/{RUC}/validarcomprobante` |
| `{RUC}` path | RUC del **contribuyente consultante** (company FACTOSYS con credenciales) |
| Header | `Authorization: Bearer {access_token}` |
| Content-Type | `application/json` |
| Body ejemplo | `{"numRuc":"…","codComp":"01","numeroSerie":"F001","numero":"12345","fechaEmision":"17/09/2026","monto":"159.30"}` |

**No** usar en MVP el WSDL SOAP legacy `billValidService` salvo fallback documentado; el producto apunta a la **consulta integrada REST**.

Adapter: `packages/sunat-consulta` o módulo dentro de `sunat-gateway` (nombre libre al bootstrap).

---

## 5. Autenticación hacia SUNAT

Según manual de consulta integrada (extranet):

| Paso | Detalle |
| --- | --- |
| Credenciales | `client_id` + `client_secret` generados en menú SOL / extranet SUNAT **por RUC consultante** |
| Token URL | `POST https://api-seguridad.sunat.gob.pe/v1/clientesextranet/{client_id}/oauth2/token/` |
| grant | `client_credentials` |
| scope | `https://api.sunat.gob.pe/v1/contribuyente/contribuyentes` (confirmar string exacto en manual vigente) |
| Respuesta | `access_token`, `token_type`, `expires_in` |
| Almacenamiento | Vault / credentials cifradas a nivel `company` (tipo `sunat_consulta` o reutilizar slot extranet); **nunca** en git |
| Cache token | Redis por `company_id`; renovar con margen (ej. 60s antes de `expires_in`) |

Relación con GRE OAuth: **credenciales distintas** (clientes SOL/GRE vs extranet consulta). No mezclar secrets. Documentar en setup sandbox ([22](22-sandbox-setup.md)) variables:

```bash
SUNAT_CONSULTA_CLIENT_ID=
SUNAT_CONSULTA_CLIENT_SECRET=
# opcional override:
SUNAT_CONSULTA_TOKEN_URL=
SUNAT_CONSULTA_BASE_URL=https://api.sunat.gob.pe
```

Si la company no tiene credenciales de consulta → `FACTOSYS_CREDENTIALS` 422.

---

## 6. Mapeo de errores → FACTOSYS ([16](16-catalogo-errores.md))

| Situación | HTTP | `code` | `stage` | `retryable` |
| --- | --- | --- | --- | --- |
| Body JSON inválido / monto faltante | 422 | `FACTOSYS_VALIDATION` | `request` | false |
| Company sin client_id/secret consulta | 422 | `FACTOSYS_CREDENTIALS` | `request` | false |
| Token SUNAT rechazado (401/invalid_client) | 422 | `FACTOSYS_CREDENTIALS` | `transport` | false |
| SUNAT 429 / cuota | 429 / 503 | `FACTOSYS_RATE_LIMITED` / `FACTOSYS_SUNAT_UNAVAILABLE` | `transport` | true |
| SUNAT 5xx / timeout | 503 | `FACTOSYS_SUNAT_UNAVAILABLE` | `transport` | true |
| `success=false` + `errorCode` de negocio SUNAT | 200* o 422 | Preferencia: **200** con `success=false` + `sunat_error_code`; si errorCode indica auth → CREDENTIALS | — | según código |
| Scope API FACTOSYS insuficiente | 403 | `FACTOSYS_FORBIDDEN` | `request` | false |

\*Mantener 200 + `success=false` evita que SDKs traten “consulta fallida de negocio” como exception de red. Documentar en OpenAPI.

Incluir siempre `request_id`. Opcional: `sunat_code` = `errorCode` string.

**No** mapear `estadoCp=0` a error: es respuesta válida “no existe”.

---

## 7. Política de cache

| Parámetro | Valor MVP propuesto |
| --- | --- |
| Clave | hash estable de `(consultante_ruc, numRuc, codComp, serie, numero, fecha, monto)` |
| Store | Redis |
| TTL estado “estable” (`1` ACEPTADO, `2` ANULADO) | **24 h** |
| TTL `0` NO_EXISTE | **5–15 min** (el CPE puede informarse pronto) |
| TTL errores transporte | **no cachear** |
| Bypass | header `Cache-Control: no-cache` o query `fresh=true` |
| Respuesta | `cached: true/false` + `checked_at` |

No cachear entre organizations distintas aunque el CPE sea el mismo (aislamiento tenant); sí dedupe dentro del mismo `company_id`.

---

## 8. Rate limits

| Capa | Límite sugerido MVP |
| --- | --- |
| FACTOSYS → cliente | Por API key: **60 req/min** (consulta); burst 10. Exceso → `FACTOSYS_RATE_LIMITED` |
| FACTOSYS → SUNAT | Circuit breaker + cola leve; no martillar token endpoint (1 token cacheado) |
| Fair use | Documentar que consulta masiva ≠ este endpoint |

Ajustar tras medir cuotas reales SUNAT; el manual no siempre publica QPS — ser conservador.

---

## 9. Fixture sugerido

Archivo propuesto: `docs/planificacion/artifacts/fixtures/validation-cpe-accepted.json` (o bajo `fixtures/validations/`).

```json
{
  "name": "validation-cpe-accepted",
  "mode": ["mock-cdr", "sunat-beta"],
  "request": {
    "company_id": "{{company_id}}",
    "ruc": "{{issuer_ruc}}",
    "document_type": "01",
    "serie": "F001",
    "number": "1",
    "issue_date": "2026-09-17",
    "total_amount": 118.00
  },
  "expect_mock": {
    "success": true,
    "cpe_status": "1",
    "cpe_status_label": "ACEPTADO",
    "ruc_status": "00"
  }
}
```

| Fixture | Propósito |
| --- | --- |
| `validation-cpe-accepted` | Happy path mock |
| `validation-cpe-not-found` | `cpe_status=0` |
| `validation-cpe-voided` | `cpe_status=2` |
| `validation-cpe-bad-amount` | 422 local (sin `total_amount`) |
| `validation-cpe-live` | Solo `sunat-beta`: consultar factura **realmente aceptada** del RUC de prueba |

Mock del gateway: `FakeConsultaCpe` con tabla estática keyed por serie-número.

---

## 10. OpenAPI — deltas vs stub actual

Actualizar `artifacts/openapi-v1.yaml` cuando se autorice edición:

1. `company_id` en request (o documentar inferencia).
2. Response rica (§2.2) en lugar de solo `estado_cp` snake suelto.
3. Preferir **snake_case inglés** en API pública (`cpe_status`) y labels; evitar exponer solo nombres SUNAT crudos (`estado_cp`) — o dual: canónico FACTOSYS + `raw`.
4. Errores 401/403/422/429/503 con schema Error existente.
5. Headers opcionales: `X-Factosys-Include-Raw`, bypass cache.

Compat: si ya se publicó el stub con `estado_cp`, mantener alias deprecado un ciclo.

---

## 11. Criterios de aceptación

- [ ] Request valida y convierte fecha/monto al wire SUNAT.
- [ ] Token extranet cacheado; consulta Bearer OK en beta.
- [ ] Mapeo `estadoCp` 0–4 + labels.
- [ ] Cache TTL diferenciado; `cached` coherente.
- [ ] Rate limit 429 con `retryable=true`.
- [ ] Fixtures mock verdes en CI sin red.
- [ ] Credenciales ausentes → `FACTOSYS_CREDENTIALS`.

---

## 12. Fuera de alcance

- UI web de consulta masiva.
- Sustituir verificación criptográfica del XML (esto no valida firma; solo registro SUNAT).
- Consulta CDR/ticket (otros endpoints).
- Dictamen legal “¿puedo acreditar crédito fiscal?” — solo proxy de estado SUNAT.
