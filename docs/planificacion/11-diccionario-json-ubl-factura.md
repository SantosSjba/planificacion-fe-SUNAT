# 11 — Diccionario JSON canónico ↔ UBL (Factura 01)

Fuente normativa: Guía XML Factura Electrónica UBL 2.1 (SUNAT) + Anexo catálogos.  
Convención: el cliente envía **JSON FACTOSYS**; el motor genera **UBL 2.1** (`Invoice`).

- Cardinalidad JSON: `required` | `optional` | `conditional`
- `M`/`C` en columna SUNAT = Mandatorio / Condicional según guía
- Catálogos: ver `anexoVII-117-2017.pdf` y ZIP RS 340-2017

## 0. Metadatos del documento (no van al UBL o van fijos)

| JSON path | Tipo | Req | UBL / nota |
| --- | --- | --- | --- |
| `company_id` | uuid | required | Resuelve emisor; no es tag UBL |
| `idempotency_key` | string | required (header o body) | Control FACTOSYS |
| `serie` | string | required | Parte de `cbc:ID` → `F001` |
| `number` | int | optional | Si omite, FACTOSYS asigna correlativo |
| `totals_mode` | `auto`\|`strict` | optional (default `auto`) | Cálculo vs validación de totales |
| `ubl_version` | const | fixed | `cbc:UBLVersionID` = `2.1` |
| `customization_id` | const | fixed | `cbc:CustomizationID` = `2.0` |

`cbc:ID` resultante: `{serie}-{number padded}` ej. `F001-00000001`.

---

## 1. Cabecera tributaria

| JSON path | Tipo | Req | Tag UBL | Cat. | SUNAT |
| --- | --- | --- | --- | --- | --- |
| `operation_type` | string | required | `cbc:ProfileID` | 51 | M |
| `issue_date` | date | required | `cbc:IssueDate` | — | M |
| `issue_time` | time | optional | `cbc:IssueTime` | — | C |
| `due_date` | date | optional | `cbc:DueDate` | — | C |
| `document_type` | string | fixed `01` | `cbc:InvoiceTypeCode` | 01 | M |
| `currency` | string | required | `cbc:DocumentCurrencyCode` | 02 | M |
| `legends` | array | optional | `cbc:Note` + `@languageLocaleID` | 52 | C |
| `legends[].code` | string | conditional | `@languageLocaleID` | 52 | C |
| `legends[].text` | string | required si legend | texto de `cbc:Note` | — | C |
| `billing_period.start` | date | optional | `cac:InvoicePeriod/cbc:StartDate` | — | C |
| `billing_period.end` | date | optional | `cac:InvoicePeriod/cbc:EndDate` | — | C |
| `purchase_order` | string | optional | `cac:OrderReference/cbc:ID` | — | C |
| `line_count` | int | optional | `cbc:LineCountNumeric` | — | C (auto si `auto`) |

---

## 2. Emisor (supplier)

Normalmente **hidrated desde `company_id`**. El JSON puede overridear solo campos permitidos.

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `supplier.ruc` | string(11) | required* | `AccountingSupplierParty/.../cbc:CompanyID` | — |
| `supplier.identity_type` | string | fixed `6` | `@schemeID` | 06 |
| `supplier.trade_name` | string | optional | `cac:PartyName/cbc:Name` | — |
| `supplier.legal_name` | string | required* | `cbc:RegistrationName` | — |
| `supplier.address_code` | string | optional | `RegistrationAddress/cbc:AddressTypeCode` | — |

\*Obligatorios en UBL; en API suelen salir del maestro de empresa.

---

## 3. Adquirente (customer)

| JSON path | Tipo | Req | Tag UBL | Cat. | SUNAT |
| --- | --- | --- | --- | --- | --- |
| `customer.identity_type` | string | required | `CompanyID/@schemeID` | 06 | M |
| `customer.identity_number` | string | required | `cbc:CompanyID` | — | M |
| `customer.name` | string | required | `cbc:RegistrationName` | — | M |
| `customer.email` | string | optional | extensión / RI | — | C |
| `customer.address.ubigeo` | string | conditional | `cac:RegistrationAddress/cbc:ID` | 13 | C |
| `customer.address.line` | string | optional | `cac:AddressLine/cbc:Line` | — | C |
| `customer.address.district` | string | optional | `cbc:District` | — | C |
| `customer.address.province` | string | optional | `cbc:CityName` / country subentity | — | C |
| `customer.address.department` | string | optional | `cbc:CountrySubentity` | — | C |
| `customer.address.country` | string | optional default `PE` | `cac:Country/cbc:IdentificationCode` | — | C |

Reglas de negocio tipicas (motor):

- Factura a RUC → `identity_type = 6` y RUC 11 dígitos.
- Exportación / no domiciliado → catálogos y `operation_type` coherentes (51).

---

## 4. Documentos relacionados

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `despatch_documents[]` | array | optional | `cac:DespatchDocumentReference` | — |
| `despatch_documents[].id` | string | required | `cbc:ID` | — |
| `despatch_documents[].document_type` | string | required | `cbc:DocumentTypeCode` | 01 (09/31…) |
| `additional_documents[]` | array | optional | `cac:AdditionalDocumentReference` | — |
| `additional_documents[].id` | string | required | `cbc:ID` | — |
| `additional_documents[].document_type` | string | required | `cbc:DocumentTypeCode` | 12 |

---

## 5. Descuentos / cargos globales

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `allowances[]` | array | optional | `cac:AllowanceCharge` | 53 |
| `allowances[].is_charge` | bool | required | `cbc:ChargeIndicator` | — |
| `allowances[].code` | string | required | `cbc:AllowanceChargeReasonCode` | 53 |
| `allowances[].factor` | decimal | optional | `cbc:MultiplierFactorNumeric` | — |
| `allowances[].amount` | decimal | required | `cbc:Amount` | — |
| `allowances[].base_amount` | decimal | required | `cbc:BaseAmount` | — |

`currencyID` de montos = `currency` del documento.

---

## 6. Impuestos a nivel documento (`TaxTotal`)

En `totals_mode: auto`, FACTOSYS arma los `TaxSubtotal` desde las líneas.

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `totals.tax_total` | decimal | auto/strict | `cac:TaxTotal/cbc:TaxAmount` | — |
| `totals.tax_subtotals[]` | array | auto/strict | `cac:TaxSubtotal` | — |
| `totals.tax_subtotals[].taxable_amount` | decimal | | `cbc:TaxableAmount` | — |
| `totals.tax_subtotals[].tax_amount` | decimal | | `cbc:TaxAmount` | — |
| `totals.tax_subtotals[].tax_category_id` | string | | `TaxCategory/cbc:ID` | 05 |
| `totals.tax_subtotals[].tax_scheme_id` | string | | `TaxScheme/cbc:ID` | 05 |
| `totals.tax_subtotals[].tax_scheme_name` | string | | `TaxScheme/cbc:Name` | 05 |
| `totals.tax_subtotals[].tax_type_code` | string | | `TaxScheme/cbc:TaxTypeCode` | 05 |

Códigos frecuentes cat. 05: `1000` IGV, `2000` ISC, `9997` exonerado, `9998` inafecto, `9995` exportación, `9996` gratuito, etc.

---

## 7. Totales monetarios (`LegalMonetaryTotal`)

| JSON path | Tipo | Req | Tag UBL | Notas |
| --- | --- | --- | --- | --- |
| `totals.line_extension_amount` | decimal | auto | `cbc:LineExtensionAmount` | Valor venta |
| `totals.tax_exclusive_amount` | decimal | auto | `cbc:TaxExclusiveAmount` | |
| `totals.tax_inclusive_amount` | decimal | auto | `cbc:TaxInclusiveAmount` | Precio venta |
| `totals.allowance_total_amount` | decimal | auto | `cbc:AllowanceTotalAmount` | Descuentos |
| `totals.charge_total_amount` | decimal | auto | `cbc:ChargeTotalAmount` | Cargos |
| `totals.prepaid_amount` | decimal | optional | `cbc:PrepaidAmount` | Anticipos |
| `totals.payable_amount` | decimal | auto/required strict | `cbc:PayableAmount` | Importe total |

Aliases amigables aceptados en API (se normalizan):

| Alias JSON | Mapea a |
| --- | --- |
| `totals.igv` | subtotal tax_scheme 1000 |
| `totals.subtotal` | `line_extension_amount` / tax exclusive según política |
| `totals.total` | `payable_amount` |

---

## 8. Detracción / formas de pago (cuando aplique)

| JSON path | Tipo | Req | Tag UBL | Cat. |
| --- | --- | --- | --- | --- |
| `detraction` | object | conditional | `PaymentMeans` + `PaymentTerms` | 54 |
| `detraction.code` | string | required si detracción | `PaymentTerms/cbc:PaymentMeansID` / ID bien | 54 |
| `detraction.percent` | decimal | required | `PaymentTerms/cbc:PaymentPercent` | — |
| `detraction.amount` | decimal | required | `PaymentTerms/cbc:Amount` | — |
| `detraction.bank_account` | string | required | `PayeeFinancialAccount/cbc:ID` | — |
| `payment_terms[]` | array | optional | `cac:PaymentTerms` | — |
| `payment_means[]` | array | optional | `cac:PaymentMeans` | — |

---

## 9. Líneas (`InvoiceLine`)

| JSON path | Tipo | Req | Tag UBL | Cat. | SUNAT |
| --- | --- | --- | --- | --- | --- |
| `lines[]` | array min 1 | required | `cac:InvoiceLine` | — | M |
| `lines[].id` | string/int | required | `cbc:ID` | — | M |
| `lines[].quantity` | decimal | required | `cbc:InvoicedQuantity` | — | M |
| `lines[].unit_code` | string | required | `@unitCode` | 03 | M |
| `lines[].description` | string | required | `cac:Item/cbc:Description` | — | M |
| `lines[].product_code` | string | optional | `SellersItemIdentification/cbc:ID` | — | C |
| `lines[].sunat_product_code` | string | optional | `CommodityClassification/cbc:ItemClassificationCode` | 25 | C |
| `lines[].gs1_code` | string | optional | clasificación GS1 alternativa | — | C |
| `lines[].unit_value` | decimal | required | `cac:Price/cbc:PriceAmount` | — | M valor unitario |
| `lines[].unit_price` | decimal | required | `PricingReference/.../cbc:PriceAmount` | 16 | M precio venta |
| `lines[].price_type` | string | optional default `01` | `PriceTypeCode` | 16 | C |
| `lines[].tax_affectation` | string | required | `TaxCategory/cbc:TaxExemptionReasonCode` | 07 | M |
| `lines[].igv_percent` | decimal | conditional | `TaxCategory/cbc:Percent` | — | C |
| `lines[].tax_scheme_id` | string | required | `TaxScheme/cbc:ID` | 05 | M |
| `lines[].line_extension_amount` | decimal | auto | `cbc:LineExtensionAmount` | — | M |
| `lines[].tax_amount` | decimal | auto | `TaxTotal/cbc:TaxAmount` | — | M |
| `lines[].allowances[]` | array | optional | `InvoiceLine/AllowanceCharge` | 53 | C |
| `lines[].isc` | object | optional | sistema ISC en TaxCategory | 08 | C |
| `lines[].additional_properties[]` | array | optional | `AdditionalItemProperty` | 55 | C |
| `lines[].additional_properties[].name` | string | required | `cbc:Name` | — | |
| `lines[].additional_properties[].code` | string | optional | `cbc:NameCode` | 55 | |
| `lines[].additional_properties[].value` | string | required | `cbc:Value` | — | |

### Free / no onerosas

| JSON path | Tag UBL |
| --- | --- |
| `lines[].reference_unit_value` | `AlternativeConditionPrice` con tipo cat. 16 para operaciones no onerosas |

---

## 10. Firma y extensiones (solo motor interno)

| Concepto | Tag UBL | Quién lo llena |
| --- | --- | --- |
| Firma XMLDSig | `ext:UBLExtensions/.../ds:Signature` + `cac:Signature` | FACTOSYS |
| Extensiones no tributarias | `UBLExtensions` adicionales | Solo si `advanced.ubl_extensions` (v2+) |

El cliente **no** envía XML ni firma.

---

## 11. Ejemplo mínimo (gravada IGV 18%)

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "serie": "F001",
  "operation_type": "0101",
  "issue_date": "2026-09-17",
  "currency": "PEN",
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
      "description": "Servicio de consultoría",
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

Compilación esperada (conceptos):

- `ProfileID` = 0101  
- `InvoiceTypeCode` = 01  
- `DocumentCurrencyCode` = PEN  
- Línea con afectación 10 (gravado) y tributo 1000  
- `PayableAmount` = 118.00  

---

## 12. Casos que el diccionario debe cubrir después (misma factura)

| Caso | Campos extra clave |
| --- | --- |
| Exportación | `operation_type` cat. 51, tributo 9995, cliente no domiciliado |
| Exonerada / inafecta | afectación 20/30, schemes 9997/9998 |
| Transferencia gratuita | leyendas cat. 52, precio referencial, 9996 |
| ISC | `lines[].isc` |
| Detracción | bloque `detraction` |
| Anticipos | `totals.prepaid_amount` + docs relacionados |
| Factura con GRE | `despatch_documents` |
| Hospedaje / transporte pasajeros | properties cat. 55 + nodos Delivery (guía) |

Cada caso tendrá un **fixture JSON + golden XML** en la fase de implementación.

---

## 13. Reglas de compilación (motor)

1. Hidratar supplier desde company.
2. Asignar/verificar correlativo atómico.
3. Normalizar aliases de totals.
4. Si `totals_mode=auto`: calcular line extensions, tax subtotals, legal monetary total.
5. Si `strict`: comparar con tolerancia decimal (ej. 0.01) o rechazar `FACTOSYS_VALIDATION`.
6. Inyectar atributos de listURI/schemeAgencyName exigidos por SUNAT (ver §14.1).
7. Validar XSD + reglas Excel antes de firmar.
8. Firmar → ZIP → enviar.

---

## 14. Estado de este diccionario

- [x] `@listURI` / schemes — `artifacts/ubl-attributes/invoice-listuri-schemes.json`
- [x] Matriz afectación IGV 07×05 — `artifacts/catalogs/matrix-07-x-05-igv.json`
- [x] Diccionarios hermanos: boleta (13), NC (14), ND (15), RC (20), RA (19), GRE (18)
- [x] JSON Schema Invoice — `artifacts/schemas/invoice-create.schema.json`
- Input adicional: `guia-datos-tributarios-recomendados-v1.0.pdf`

### 14.1 Atributos UBL fijos

El motor debe inyectar literales `@listURI` / `@listName` / `@listAgencyName` / `@schemeURI` / `@schemeName` / `@schemeAgencyName` / `@unitCodeList*` según:

**[`artifacts/ubl-attributes/invoice-listuri-schemes.json`](artifacts/ubl-attributes/invoice-listuri-schemes.json)**

Cobertura núcleo: `ProfileID`, `InvoiceTypeCode`, `DocumentCurrencyCode`, identidad emisor/adquirente (Cat. 06), `TaxExemptionReasonCode` (Cat. 07), `TaxScheme`/`TaxCategory` (UNECE + Cat. 05), `PriceTypeCode` (Cat. 16), `InvoicedQuantity` unit lists, detracción `PaymentTerms` (Cat. 54), docs relacionados, y nodos SSPP/delivery/hospedaje/pasajeros cuando apliquen.

Gaps documentados en el mismo JSON (p. ej. `AllowanceChargeReasonCode` y ubigeo **sin** listURI en la guía; `ProfileID/@schemeURI=catalogo17` pese a Cat. 51; inconsistencia Despatch `catalogo01` vs tabla `catalogo12`).

### 14.2 Matriz IGV

Pares permitidos MVP: **[`artifacts/catalogs/matrix-07-x-05-igv.json`](artifacts/catalogs/matrix-07-x-05-igv.json)** (validar contra ruleset pineado en runtime).