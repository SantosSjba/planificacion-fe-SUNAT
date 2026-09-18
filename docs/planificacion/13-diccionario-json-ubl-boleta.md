# 13 — Diccionario JSON ↔ UBL (Boleta 03)

Misma convención que [11-diccionario-json-ubl-factura.md](11-diccionario-json-ubl-factura.md).  
Raíz UBL: **`Invoice`** (igual que factura).  
`document_type` fijo: **`03`**. Serie típica: **`B###`**.

Fuente: Guía XML Boleta Electrónica UBL 2.1.

## Diferencias vs factura (lo que el integrador debe saber)

| Tema | Factura 01 | Boleta 03 |
| --- | --- | --- |
| Serie | `F###` | `B###` |
| `InvoiceTypeCode` | `01` | `03` |
| Cliente | Suele ser RUC (6) | DNI (1), CE, pasaporte, RUC según caso |
| Envío SUNAT | `SendBill` síncrono | Individual **o** vía **Resumen Diario (RC)** |
| Validez operativa | CDR de la factura | Debe informarse en RC (salvo envío individual vigente) |
| Endpoint FACTOSYS | `POST /invoices` | `POST /receipts` |

Campos compartidos con factura (reutilizar diccionario 11): supplier, lines (estructura), allowances, tax totals, legends, despatch/additional documents, `totals_mode`.

---

## Metadatos

| JSON path | Req | Nota |
| --- | --- | --- |
| `company_id` | required | |
| `serie` | required | Debe empezar con `B` |
| `number` | optional | Correlativo |
| `document_type` | fixed `03` | `cbc:InvoiceTypeCode` |
| `operation_type` | required | `cbc:ProfileID` cat. 51 |
| `include_in_daily_summary` | optional bool default `true` | Si true, FACTOSYS la encola para RC |
| `send_individually` | optional bool default `false` | Override de envío `SendBill` individual |

---

## Cabecera (tags iguales a factura salvo tipo)

| JSON path | Tag UBL | Cat. |
| --- | --- | --- |
| `issue_date` | `cbc:IssueDate` | — |
| `issue_time` | `cbc:IssueTime` | — |
| `currency` | `cbc:DocumentCurrencyCode` | 02 |
| `legends[]` | `cbc:Note` | 52 |
| `operation_type` | `cbc:ProfileID` | 51 |

No es habitual `due_date` en boleta B2C; permitido como optional si el caso lo requiere.

---

## Cliente (adquirente)

| JSON path | Req | Cat. 06 típico |
| --- | --- | --- |
| `customer.identity_type` | required | `1` DNI, `4` CE, `7` pasaporte, `6` RUC, `0` doc. tributaria no domiciliado según catálogo |
| `customer.identity_number` | required | |
| `customer.name` | required | |
| `customer.address.*` | optional | |

Regla motor: si monto supera umbrales SUNAT que exigen identificación plena, validar tipo/número (pre-regla local + Excel).

---

## Líneas y totales

Idénticos en forma al diccionario de factura (`lines[]`, `totals.*`).  
Compilar a los mismos nodos `InvoiceLine` / `TaxTotal` / `LegalMonetaryTotal`.

---

## Ciclo RC (producto)

Tras `accepted` local / registro:

1. Documento queda en pool `pending_summary`.
2. Job o `POST /daily-summaries` agrupa boletas (+ NC/ND vinculadas a boleta) del día.
3. Estado del RC es independiente; la boleta expone `summary_id` cuando se informa.

Ver diccionario RC: [20-diccionario-json-ubl-rc.md](20-diccionario-json-ubl-rc.md). Campo de lectura:

| JSON response | Significado |
| --- | --- |
| `summary_status` | `not_required` \| `pending` \| `included` \| `accepted` \| `rejected` |
| `summary_document_id` | uuid del RC |

---

## Ejemplo mínimo

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "serie": "B001",
  "operation_type": "0101",
  "issue_date": "2026-09-17",
  "currency": "PEN",
  "customer": {
    "identity_type": "1",
    "identity_number": "12345678",
    "name": "JUAN PEREZ"
  },
  "lines": [
    {
      "id": 1,
      "quantity": 2,
      "unit_code": "NIU",
      "description": "Producto",
      "unit_value": 50.00,
      "unit_price": 59.00,
      "tax_affectation": "10",
      "igv_percent": 18,
      "tax_scheme_id": "1000"
    }
  ],
  "totals_mode": "auto",
  "include_in_daily_summary": true
}
```
