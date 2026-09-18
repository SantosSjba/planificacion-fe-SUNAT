# 17 — Spec de SDKs oficiales

Objetivo: que un desarrollador en **cualquier stack** emita su primera factura aceptada en sandbox sin leer UBL.

OpenAPI fuente: [`artifacts/openapi-v1.yaml`](artifacts/openapi-v1.yaml).

## 1. Paquetes v1 (prioridad)

| Lenguaje | Package name (tentativo) | Manager | Generación |
| --- | --- | --- | --- |
| TypeScript / Node | `@factosys/sdk` | npm | openapi-generator o fern + hand tweaks |
| PHP | `factosys/sdk` | Composer | openapi-generator |
| Python | `factosys` | PyPI | openapi-generator / httpx wrapper |
| C# | `Factosys.Sdk` | NuGet | openapi-generator |
| Java | `pe.factosys.sdk` | Maven/Gradle | openapi-generator |

v2: Go (`github.com/factosys/factosys-go`), Dart (`factosys`).

## 2. Principios

1. **OpenAPI es la verdad** — regenerar clientes en CI cuando cambie el YAML.
2. **Capa idiomatic hand-written** encima del cliente generado (errores tipados, retries, idempotency helper).
3. **Misma semántica en todos los lenguajes** (nombres de métodos ≈ `operationId`).
4. **Cero UBL** en la API pública del SDK.
5. **Secretos** nunca logueados (redaction helper).

## 3. Superficie mínima del SDK

```text
FactosysClient
  .companies.create / get / putCertificate / putSol / putGre
  .series.list / create
  .invoices.create
  .receipts.create
  .creditNotes.create
  .debitNotes.create
  .documents.get / list / getXml / getCdr / getPdf / getTrace
  .voidedDocuments.create
  .dailySummaries.create
  .despatchAdvices.create
  .validations.validateCpe
  .webhooks.create / list / rotateSecret
  .meta.getRuleset
```

Helpers obligatorios:

| Helper | Comportamiento |
| --- | --- |
| `withIdempotencyKey(key)` | Inyecta header |
| `createInvoiceAndWait(doc, { timeout })` | Poll `getDocument` hasta terminal o timeout |
| `verifyWebhookSignature(payload, header, secret)` | HMAC-SHA256 |
| `isRetryable(error)` | Usa `error.retryable` |

## 4. Configuración del cliente

```ts
new FactosysClient({
  apiKey: process.env.FACTOSYS_API_KEY,
  baseUrl: 'https://sandbox.api.factosys.pe/v1', // default prod
  timeoutMs: 30_000,
  maxRetries: 3, // solo retryable
})
```

Equivalente en PHP/Python/C#/Java.

## 5. Errores tipados

Mapear JSON de [16-catalogo-errores.md](16-catalogo-errores.md) a clases/enums:

| code | Clase / enum |
| --- | --- |
| `FACTOSYS_VALIDATION` | `ValidationError` |
| `FACTOSYS_SUNAT_REJECTED` | `SunatRejectedError` |
| `FACTOSYS_SUNAT_UNAVAILABLE` | `SunatUnavailableError` |
| `FACTOSYS_IDEMPOTENCY_CONFLICT` | `IdempotencyConflictError` |
| `FACTOSYS_CREDENTIALS` | `CredentialsError` |
| otros | `FactosysError` base |

Propiedades comunes: `sunatCode`, `sunatMessage`, `requestId`, `stage`, `retryable`, `details`.

## 6. Ejemplo canónico (todos los README de SDK)

Misma historia en 5 lenguajes:

1. Crear client sandbox.
2. (Asumir company+cert+SOL ya configurados vía dashboard o API).
3. `invoices.create` con payload del diccionario 11.
4. Imprimir `status`, `serie_number`, link XML.

TypeScript (referencia):

```ts
import { FactosysClient } from '@factosys/sdk';

const client = new FactosysClient({
  apiKey: process.env.FACTOSYS_API_KEY!,
  baseUrl: 'https://sandbox.api.factosys.pe/v1',
});

const doc = await client.invoices.create(
  {
    company_id: process.env.COMPANY_ID!,
    serie: 'F001',
    operation_type: '0101',
    issue_date: '2026-09-17',
    currency: 'PEN',
    customer: {
      identity_type: '6',
      identity_number: '20123456789',
      name: 'ACME SAC',
    },
    lines: [
      {
        id: 1,
        quantity: 1,
        unit_code: 'NIU',
        description: 'Servicio',
        unit_value: 100,
        unit_price: 118,
        tax_affectation: '10',
        igv_percent: 18,
        tax_scheme_id: '1000',
      },
    ],
    totals_mode: 'auto',
  },
  { idempotencyKey: crypto.randomUUID() },
);

console.log(doc.status, doc.serie_number);
```

## 7. Generación y CI (cuando exista monorepo)

```
openapi-v1.yaml
    │
    ├─► generate ts/php/python/csharp/java
    │
    └─► smoke: build + typecheck + ejemplo sandbox (opt-in secret)
```

Regla: PR que cambie OpenAPI **debe** regenerar SDKs o fallar CI.

## 8. Versionado

| Política | Detalle |
| --- | --- |
| API | URL `/v1` |
| SDK | SemVer; major si rompe tipos |
| OpenAPI `info.version` | Alineado a release API |
| User-Agent | `factosys-sdk-{lang}/{version}` |

## 9. Docs portal (producto)

- Quickstarts por lenguaje
- Postman collection export desde OpenAPI
- Cookbook: boleta+RC, NC sobre factura, GRE pre-despacho, webhooks
- Página de errores con buscador por `sunat_code` (datos desde `sunat-codigos-retorno.json`)

## 10. Fuera de v1 SDK

- Generar UBL localmente
- Manejo de certificados en el SDK cliente (solo API)
- Wrappers de frameworks (Nest/Laravel modules) — comunidad o v2
