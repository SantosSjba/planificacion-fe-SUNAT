# 21 — Fixtures de sandbox

Plan de casos de prueba para el ambiente sandbox (beta SUNAT + motor local).  
JSON de entrada: [`artifacts/fixtures/`](artifacts/fixtures/).

## 1. Objetivos

| Objetivo | Cómo se mide |
| --- | --- |
| Onboarding DX | Fixture `01-invoice-gravada` pasa a `accepted` o falla con error accionable |
| Pre-validación | Fixtures `*-prevalidation-*` nunca llaman SUNAT; devuelven `sunat_code` esperado |
| Cobertura MVP | Al menos un happy path por documento v1 |
| Regresión | Golden files: request JSON + expected status/code |

## 2. Convenciones de archivo

```
artifacts/fixtures/
  meta.json                 # catálogo de fixtures
  01-invoice-gravada.json
  01-invoice-exonerada.json
  …
```

Cada fixture:

```json
{
  "id": "01-invoice-gravada",
  "document_kind": "invoice",
  "title": "Factura gravada IGV 18%",
  "expects": {
    "stage": "sunat_or_mock",
    "terminal_status": ["accepted", "accepted_with_observation"],
    "prevalidation": "pass"
  },
  "notes": "…",
  "request": { }
}
```

`company_id` en fixtures usa placeholder `{{company_id}}` — el runner lo sustituye.

## 3. Matriz MVP

| ID | Kind | Escenario | Expect |
| --- | --- | --- | --- |
| `01-invoice-gravada` | invoice | IGV 18% 1 línea | accept / pass pre |
| `01-invoice-exonerada` | invoice | Afectación 20 | accept / pass pre |
| `01-invoice-exportacion` | invoice | operación exportación | accept / pass pre |
| `01-invoice-detraccion` | invoice | detracción cat. 54 | accept / pass pre |
| `01-invoice-bad-totals` | invoice | totals_mode strict incoherente | `FACTOSYS_VALIDATION` |
| `03-receipt-dni` | receipt | Boleta a DNI | pass + pending_summary |
| `07-credit-note-void` | credit_note | NC tipo 01 sobre factura | pass |
| `08-debit-note-interest` | debit_note | ND tipo 01 | pass |
| `ra-void-invoice` | voided | Baja de factura aceptada | ticket→accept |
| `rc-daily-auto` | summary | RC del día (auto lines) | ticket→accept |
| `09-gre-remitente-min` | gre | GRE 09 mínima | ticket→accept |
| `31-gre-transportista-min` | gre | GRE 31 mínima | ticket→accept |
| `01-invoice-serie-format` | invoice | Serie inválida | sunat_code ~1001 vía pre |

Schemas JSON: [`artifacts/schemas/`](artifacts/schemas/). Setup: [`22-sandbox-setup.md`](../22-sandbox-setup.md).

## 4. Ambientes de ejecución

| Mode | Comportamiento |
| --- | --- |
| `local-rules` | Solo motor Excel/XSD; no red SUNAT |
| `sunat-beta` | Firma real + WSDL/REST beta |
| `mock-cdr` | Simula CDR accepted/rejected para demos sin SOL |

Sandbox de producto = `local-rules` + `sunat-beta` seleccionable por `company.environment`.

## 5. Criterio “fixture verde”

1. Request valida contra OpenAPI / diccionario.
2. Pre-validación produce el resultado esperado.
3. Si `sunat-beta`: estado terminal en timeout configurable (ej. 120s) o ticket resuelto.
4. Artefactos XML/CDR descargables cuando accepted.

## 6. Datos de prueba

- RUC y certificado: **no** se commitean. Solo placeholders.
- Guía de setup sandbox: [22-sandbox-setup.md](22-sandbox-setup.md) (RUC/cert cuando existan).
- Validez: fixture `validation-cpe-accepted.json` + spec [28](28-spec-consulta-validez.md).
- Gate XSD/Excel: [29](29-plan-gate-xsd-xsl.md).

## 7. Relación con SDKs

Cada SDK README ejecuta mentalmente `01-invoice-gravada`.  
CI de SDKs (futuro): `local-rules` obligatoria; `sunat-beta` nightly opcional.
