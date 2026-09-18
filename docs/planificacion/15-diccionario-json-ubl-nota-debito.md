# 15 — Diccionario JSON ↔ UBL (Nota de Débito 08)

Raíz UBL: **`DebitNote`**.  
`document_type` fijo: **`08`**.  
Fuente: Guía XML Nota de Débito UBL 2.1 + catálogo **10** (tipos de ND).

Endpoint: `POST /debit-notes`.

Estructura casi espejo de la nota de crédito; cambia raíz, catálogo de tipo y nombres de línea.

---

## Diferencias vs NC

| Tema | NC 07 | ND 08 |
| --- | --- | --- |
| Raíz | `CreditNote` | `DebitNote` |
| Catálogo tipo | 09 | **10** |
| Línea | `CreditNoteLine` / `CreditedQuantity` | `DebitNoteLine` / `DebitedQuantity` |
| Uso de negocio | Reduce / anula / descuenta | Penalidad / intereses / aumentos |

---

## Campos núcleo

| JSON path | Req | Tag UBL | Cat. |
| --- | --- | --- | --- |
| `note_type` | required | `DiscrepancyResponse/cbc:ResponseCode` | **10** |
| `reason` | required | `DiscrepancyResponse/cbc:Description` | — |
| `affected_document.serie_number` | required | `ReferenceID` + `BillingReference/.../cbc:ID` | — |
| `affected_document.document_type` | required | `DocumentTypeCode` | 01 |
| `serie`, `issue_date`, `currency`, `customer`, `lines`, `totals` | como NC | bajo `DebitNote` | — |

Tipos ND frecuentes (cat. 10 — verificar vigente):

| Código | Uso típico |
| --- | --- |
| `01` | Intereses por mora |
| `02` | Aumento de valor |
| `03` | Penalidades / otros conceptos |

---

## Líneas

| JSON path | Tag UBL |
| --- | --- |
| `lines[].quantity` | `cbc:DebitedQuantity` + `@unitCode` |
| resto | análogo a factura/NC sobre `DebitNoteLine` |

---

## Ejemplo mínimo

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "serie": "F001",
  "issue_date": "2026-09-18",
  "currency": "PEN",
  "note_type": "01",
  "reason": "Intereses por mora",
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
      "description": "Interés moratorio",
      "unit_value": 20.00,
      "unit_price": 23.60,
      "tax_affectation": "10",
      "igv_percent": 18,
      "tax_scheme_id": "1000"
    }
  ],
  "totals_mode": "auto"
}
```

---

## Shared kernel (implementación)

En código, unificar builders:

```
InvoiceBuilder (01/03)
CreditNoteBuilder (07)
DebitNoteBuilder (08)
  └─ shared: PartyMapper, TaxMapper, TotalsMapper, LineTaxMapper
```

Solo cambian raíz, type code, discrepancy/billing reference y nombre de quantity.
