# 08 — API pública (borrador)

Contrato conceptual v1.  
**OpenAPI formal:** [`artifacts/openapi-v1.yaml`](artifacts/openapi-v1.yaml)  
**SDKs:** [17-spec-sdks.md](17-spec-sdks.md) · **Errores:** [16-catalogo-errores.md](16-catalogo-errores.md)

## 1. Convenciones

| Tema | Regla |
| --- | --- |
| Base URL | `https://api.factosys.pe/v1` (nombre tentativo) |
| Formato | JSON UTF-8 |
| Auth | `Authorization: Bearer <api_key>` |
| Idempotencia | Header `Idempotency-Key` en POST de emisión |
| Tiempo | ISO-8601 |
| Errores | `{ "code": "FACTOSYS_…", "message": "…", "sunat_code": "…", "details": [] }` |
| Versionado | URL `/v1`; breaking changes → `/v2` |

## 2. Recursos

### Tenancy / empresa

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/companies` | Alta de emisor (RUC, datos fiscales) |
| GET | `/companies/{id}` | Datos públicos del emisor (sin secretos) |
| PUT | `/companies/{id}/certificate` | Subir/activar certificado |
| PUT | `/companies/{id}/sol-credentials` | Guardar SOL |
| PUT | `/companies/{id}/gre-credentials` | client_id/secret GRE |

### Series y correlativos

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/companies/{id}/series` | Crear serie (F001, B001, T001…) |
| GET | `/companies/{id}/series` | Listar |
| POST | `/companies/{id}/series/{serie}/reserve` | (interno) reserva atómica |

### Emisión CPE

| Método | Path | Documento |
| --- | --- | --- |
| POST | `/invoices` | Factura 01 |
| POST | `/receipts` | Boleta 03 |
| POST | `/credit-notes` | Nota crédito 07 |
| POST | `/debit-notes` | Nota débito 08 |
| GET | `/documents/{id}` | Estado + links artefactos |
| GET | `/documents` | Filtros por RUC, fecha, tipo, estado |

No exponer un único `/documents` genérico de escritura: tipos distintos = contratos distintos.

### Ciclo de vida

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/voided-documents` | Comunicación de baja (RA) |
| POST | `/daily-summaries` | Resumen diario (RC) |
| GET | `/daily-summaries/{id}` | Estado / ticket |

### GRE

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/despatch-advices` | GRE 09 / 31 (`document_type` en body) |
| GET | `/despatch-advices/{id}` | Estado CDR GRE |

### Consultas

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/validations/cpe` | Proxy a consulta integrada SUNAT |
| GET | `/documents/{id}/cdr` | Descargar CDR |
| GET | `/documents/{id}/xml` | XML firmado |
| GET | `/documents/{id}/pdf` | Representación impresa |

### Webhooks

| Método | Path | Descripción |
| --- | --- | --- |
| POST | `/webhook-endpoints` | Registrar URL |
| GET | `/webhook-endpoints` | Listar |
| POST | `/webhook-endpoints/{id}/rotate-secret` | Rotar HMAC |

## 3. Modelo canónico (factura — esqueleto)

Campos de alto nivel (detalle UBL se define en diccionario posterior):

```json
{
  "company_id": "uuid",
  "serie": "F001",
  "issue_date": "2026-09-17",
  "currency": "PEN",
  "operation_type": "0101",
  "customer": {
    "identity_type": "6",
    "identity_number": "20123456789",
    "name": "ACME SAC",
    "address": { "ubigeo": "150101", "line": "…" }
  },
  "lines": [
    {
      "id": "1",
      "description": "Servicio",
      "quantity": 1,
      "unit_code": "NIU",
      "unit_price": 100.00,
      "tax": { "code": "10", "percent": 18 }
    }
  ],
  "totals": {
    "tax_inclusive": 118.00,
    "tax_exclusive": 100.00,
    "igv": 18.00
  },
  "payment_terms": [],
  "additional_properties": {}
}
```

Regla: `totals` pueden ser calculados por FACTOSYS si se envía política `totals_mode: "auto"`; en modo `strict` deben cuadrar o se rechaza.

## 4. Evento webhook (ejemplo)

```json
{
  "event": "document.status_changed",
  "occurred_at": "2026-09-17T20:00:00Z",
  "data": {
    "document_id": "uuid",
    "type": "01",
    "serie_number": "F001-00000123",
    "status": "accepted",
    "sunat_code": "0",
    "links": {
      "self": "/v1/documents/uuid",
      "xml": "/v1/documents/uuid/xml",
      "cdr": "/v1/documents/uuid/cdr",
      "pdf": "/v1/documents/uuid/pdf"
    }
  }
}
```

## 5. Mapeo error FACTOSYS ↔ SUNAT

| code | Cuándo |
| --- | --- |
| `FACTOSYS_VALIDATION` | Falló pre-validación local |
| `FACTOSYS_IDEMPOTENCY_CONFLICT` | Misma key, body distinto |
| `FACTOSYS_SUNAT_REJECTED` | CDR rechazada (`sunat_code` presente) |
| `FACTOSYS_SUNAT_UNAVAILABLE` | Timeout / 5xx / SOAP fault de transporte |
| `FACTOSYS_CREDENTIALS` | Certificado o SOL inválidos |
| `FACTOSYS_FORBIDDEN` | Tenant / scope |

## 6. Sandbox

- Misma API; flag `environment: sandbox` a nivel de company o key.
- Apunta a WSDL/REST beta.
- Motor de reglas local puede forzar casos de rechazo para demos.
