# 16 — Catálogo de errores FACTOSYS ↔ SUNAT

Fuente primaria: `docs/sunat-oficial/04-esquemas-validacion/reglas-validacion-cpe-2026-08-26.xlsx`  
Hoja **CódigosRetorno**: **2077** códigos exportados a:

- [`artifacts/sunat-codigos-retorno.json`](artifacts/sunat-codigos-retorno.json)
- [`artifacts/sunat-codigos-retorno.csv`](artifacts/sunat-codigos-retorno.csv)

Complemento: `listado-observaciones-migran-a-error.xlsx` (observaciones que pasan a error con código nuevo 32xx/33xx).

## 1. Modelo de error API

```json
{
  "code": "FACTOSYS_SUNAT_REJECTED",
  "message": "SUNAT rechazó el comprobante",
  "sunat_code": "2324",
  "sunat_message": "El archivo de comunicacion de baja ya fue presentado anteriormente",
  "stage": "sunat_cdr",
  "retryable": false,
  "details": [
    { "path": "serie", "issue": "..." }
  ],
  "request_id": "uuid"
}
```

| Campo | Uso |
| --- | --- |
| `code` | Código estable FACTOSYS (SDK switch) |
| `sunat_code` | Código oficial (string, preservar ceros: `"0102"`) |
| `stage` | `request` \| `prevalidation` \| `sign` \| `transport` \| `sunat_cdr` \| `webhook` |
| `retryable` | Si el cliente puede reintentar con la misma Idempotency-Key |

## 2. Códigos FACTOSYS (capa producto)

| code | HTTP | Cuándo | retryable |
| --- | --- | --- | --- |
| `FACTOSYS_VALIDATION` | 422 | JSON inválido / diccionario / reglas locales | false |
| `FACTOSYS_IDEMPOTENCY_CONFLICT` | 409 | Misma key, body distinto | false |
| `FACTOSYS_CONFLICT_CORRELATIVE` | 409 | Correlativo ya usado | false |
| `FACTOSYS_CREDENTIALS` | 401/422 | SOL/cert/GRE auth | false* |
| `FACTOSYS_FORBIDDEN` | 403 | Scope/tenant | false |
| `FACTOSYS_NOT_FOUND` | 404 | Documento inexistente | false |
| `FACTOSYS_SUNAT_REJECTED` | 422 | CDR/rechazo de negocio SUNAT | false |
| `FACTOSYS_SUNAT_OBSERVED` | 200/202 | Aceptado con observación | n/a |
| `FACTOSYS_SUNAT_UNAVAILABLE` | 503 | Timeout, 5xx, batch caído | **true** |
| `FACTOSYS_RATE_LIMITED` | 429 | Rate limit | true |
| `FACTOSYS_INTERNAL` | 500 | Bug propio | true (con cuidado) |

\*Reintentar solo tras corregir credenciales.

## 3. Familias de códigos SUNAT (mapa operativo)

| Rango | Familia | Ejemplos | FACTOSYS code típico |
| --- | --- | --- | --- |
| `01xx`–`03xx` | Auth, ZIP, transporte, tickets | 0102, 0151, 0127, 0156 | `CREDENTIALS` / `UNAVAILABLE` / `VALIDATION` |
| `10xx` | ID, serie-correlativo, type code | 1001, 1033, 1035 | `VALIDATION` / `CONFLICT_CORRELATIVE` |
| `20xx` | Contribuyente / autorización | 2010, 2011, 2012 | `SUNAT_REJECTED` |
| `20xx` firma/XML | 2084–2093, 2072–2075 | Firma / UBLVersion | `VALIDATION` (pre) o `REJECTED` |
| `22xx`–`26xx` | Reglas de negocio CPE | totales, fechas, RC/RA | `SUNAT_REJECTED` |
| `32xx`–`33xx` | Errores “nuevos” (ex-obs) | migrados desde OBSERV | `SUNAT_REJECTED` |
| `40xx`–`43xx` | Observaciones históricas | 4022, 4287… | `SUNAT_OBSERVED` o error si migró |

**Regla de producto:** el motor de pre-validación debe conocer el Excel vigente. Si un código está en `listado-observaciones-migran-a-error.xlsx`, tratarlo como **ERROR** aunque el mensaje histórico diga OBSERV.

## 4. Códigos SUNAT frecuentes (cheat sheet MVP)

### Transporte / archivo

| sunat_code | Mensaje (resumen) | retryable |
| --- | --- | --- |
| 0100 | Sistema no puede responder | true |
| 0102 | Usuario o contraseña incorrectos | false |
| 0111 | Sin perfil para enviar CPE | false |
| 0127 | Ticket no existe | false |
| 0151 | Nombre ZIP incorrecto | false |
| 0154 | RUC archivo ≠ usuario | false |
| 0155–0158 | ZIP vacío/corrupto/contenido | false |
| 0159–0161 | XML nombre/vacío/mismatch ZIP | false |

### Identidad del comprobante

| sunat_code | Mensaje (resumen) |
| --- | --- |
| 1001 | Serie-correlativo formato inválido |
| 1033 | Comprobante ya registrado |
| 1035 / 1036 | Serie/número no coincide con archivo |
| 1049 | ID no coincide con nombre de archivo |

### Contribuyente

| sunat_code | Mensaje (resumen) |
| --- | --- |
| 2010 | Contribuyente no activo |
| 2011 | No habido |
| 2012 | No autorizado a emitir electrónicos |

### UBL / firma

| sunat_code | Mensaje (resumen) |
| --- | --- |
| 2072 / 2073 | CustomizationID |
| 2074 / 2075 | UBLVersionID |
| 2084–2093 | Firma / UBLExtensions |

### Observaciones → error (muestra del listado)

| OBSERV antiguo | Nuevo ERROR | Tema |
| --- | --- | --- |
| 4287 | 3270 | Precio unitario |
| 4288 | 3271 | Valor de venta ítem |
| 4294 | 3272 | Base imponible línea |
| 4295–4297 | 3273–3275 | Sumatorias valor venta |
| 4301 | 3294 | Sumatoria impuestos globales |
| 4028 (NC) | 3286 | Monto total NC |

Lista completa: Excel de observaciones + JSON exportado.

## 5. Estrategia del motor de pre-validación

1. Cargar `sunat-codigos-retorno.json` versionado en el repo de código (copiar desde artifacts al implementar).
2. Implementar reglas por prioridad MVP desde hojas `Factura2_0`, `Boleta2_0`, `NotaCredito2_0`, `NotaDebito2_0`, `Firma`, `General`.
3. Cada regla local emite el **mismo `sunat_code`** que SUNAT devolvería, más `code=FACTOSYS_VALIDATION` y `stage=prevalidation`.
4. Si pasa pre-validación y SUNAT rechaza: `FACTOSYS_SUNAT_REJECTED` + CDR.
5. Versionar el Excel: `ruleset_version: "2026-08-26"` en respuesta de error y en `GET /meta/ruleset`.

## 6. Mapeo SDK (pseudo)

```ts
switch (err.code) {
  case 'FACTOSYS_SUNAT_UNAVAILABLE':
  case 'FACTOSYS_RATE_LIMITED':
    retry();
    break;
  case 'FACTOSYS_VALIDATION':
  case 'FACTOSYS_SUNAT_REJECTED':
    fixPayload(err.sunat_code, err.details);
    break;
  case 'FACTOSYS_IDEMPOTENCY_CONFLICT':
    fetchOriginal();
    break;
}
```

## 7. Mantenimiento

| Evento | Acción |
| --- | --- |
| SUNAT publica nuevo Excel de reglas | Re-descargar a `sunat-oficial/04-esquemas-validacion`, re-exportar artifacts, bump `ruleset_version` |
| Nuevo listado OBS→ERROR | Actualizar tabla §4 y tests golden |
| Código no catalogado en JSON | Log + devolver `sunat_message` crudo igual |

## 8. Fuera de alcance de este doc

- Traducir los 2077 mensajes a “humano marketing” (opcional UX después).
- Reglas GRE (Excel GRE aparte) → catálogo hermano en v1 GRE.
