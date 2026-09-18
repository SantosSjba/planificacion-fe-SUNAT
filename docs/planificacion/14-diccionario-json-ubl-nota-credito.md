# 14 — Diccionario JSON ↔ UBL (Nota de Crédito 07)

Raíz UBL: **`CreditNote`**.  
`document_type` fijo: **`07`**.  
Fuente: Guía XML Nota de Crédito UBL 2.1 + catálogo 09 (tipos de NC).

Reutiliza de factura: supplier, customer, lines (estructura), tax totals, legends, allowances (según guía), `totals_mode`.

Endpoint: `POST /credit-notes`.

---

## Diferencias críticas vs factura

| Tema | Valor |
| --- | --- |
| Raíz | `CreditNote` (no `Invoice`) |
| Serie | Misma familia que el doc afectado (`F###` o `B###`) según reglas SUNAT |
| Tipo NC | `note_type` → catálogo **09** |
| Documento afectado | Obligatorio (`affected_document`) |
| Sustento | `reason` obligatorio |
| Líneas | `CreditNoteLine` (`cac:CreditNoteLine`) |
| Cantidad | `cbc:CreditedQuantity` |

---

## Metadatos y cabecera

| JSON path | Req | Tag UBL | Cat. |
| --- | --- | --- | --- |
| `company_id` | required | — | — |
| `serie` | required | parte de `cbc:ID` | — |
| `number` | optional | correlativo | — |
| `issue_date` | required | `cbc:IssueDate` | — |
| `issue_time` | optional | `cbc:IssueTime` | — |
| `currency` | required | `cbc:DocumentCurrencyCode` | 02 |
| `legends[]` | optional | `cbc:Note` | 52 |
| `ubl_version` | fixed | `2.1` | — |
| `customization_id` | fixed | `2.0` | — |

---

## Tipo de nota y documento afectado (núcleo)

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `note_type` | string | required | `cac:DiscrepancyResponse/cbc:ResponseCode` | **09** |
| `reason` | string | required | `cac:DiscrepancyResponse/cbc:Description` | — |
| `affected_document.serie_number` | string | required | `DiscrepancyResponse/cbc:ReferenceID` **y** `BillingReference/.../cbc:ID` | — |
| `affected_document.document_type` | string | required | `BillingReference/.../cbc:DocumentTypeCode` | **01** (`01`\|`03`\|…) |

Tipos NC frecuentes (cat. 09 — verificar catálogo vigente):

| Código | Uso típico |
| --- | --- |
| `01` | Anulación de la operación |
| `02` | Anulación por error en el RUC |
| `03` | Corrección por error en la descripción |
| `04` | Descuento global |
| `05` | Descuento por ítem |
| `06` | Devolución total |
| `07` | Devolución por ítem |
| `08` | Bonificación |
| `09` | Disminución en el valor |
| `10` | Otros conceptos |
| `11`–`13` | Ajustes operaciones de exportación / IVAP / etc. (según catálogo) |

Motor: validar coherencia `note_type` ↔ presencia de líneas/montos ↔ tipo de documento afectado.

---

## Referencias opcionales

| JSON path | Tag UBL |
| --- | --- |
| `despatch_documents[]` | `cac:DespatchDocumentReference` |
| `additional_documents[]` | `cac:AdditionalDocumentReference` |

---

## Líneas

| JSON path | Tag UBL | Nota |
| --- | --- | --- |
| `lines[].id` | `cbc:ID` | |
| `lines[].quantity` | `cbc:CreditedQuantity` | `@unitCode` cat. 03 |
| `lines[].description` | `cac:Item/cbc:Description` | |
| `lines[].unit_value` / `unit_price` | `Price` / `PricingReference` | Igual semántica factura |
| `lines[].tax_affectation` | TaxCategory | cat. 07 |
| `lines[].tax_scheme_id` | TaxScheme | cat. 05 |
| resto impuestos/descuentos | como factura | sobre `CreditNoteLine` |

---

## Totales

Misma forma JSON que factura (`totals.*` → `LegalMonetaryTotal` / `TaxTotal` bajo `CreditNote`).

---

## Ejemplo mínimo

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "serie": "F001",
  "issue_date": "2026-09-18",
  "currency": "PEN",
  "note_type": "01",
  "reason": "Anulación de la operación",
  "affected_document": {
    "document_type": "01",
    "serie_number": "F001-00000015"
  },
  "customer": {
    "identity_type": "6",
    "identity_number": "20123456789",
    "name": "ACME SAC"
  },
  "lines": [
    {
      "id": 1,
      "quantity": 1,
      "unit_code": "NIU",
      "description": "Servicio anulado",
      "unit_value": 100.00,
      "unit_price": 118.00,
      "tax_affectation": "10",
      "igv_percent": 18,
      "tax_scheme_id": "1000"
    }
  ],
  "totals_mode": "auto"
}
```

---

## Relación con boletas

Si `affected_document.document_type = 03`, la NC suele informarse en **resumen diario** junto con boletas. Flag:

`include_in_daily_summary` (default `true` si afecta boleta).
