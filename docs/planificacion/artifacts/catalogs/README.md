# Catálogos SUNAT — exportados

Artefactos JSON para validación local y diccionarios FACTOSYS.

**Formato:** `NN-slug.json` con `catalog`, `version`, `source`, `completeness`, `items[]` (`code`, `description`, …).

**Exportados:** 2026-09-17 vía `export_from_sunat.py`.

## Fuentes

| Fuente | Rol |
| --- | --- |
| `docs/sunat-oficial/04-esquemas-validacion/reglas-validacion-cpe-2026-08-26.xlsx` hoja Catálogos | **Primaria** — Anexo N°8 vigente embebido en reglas CPE (cpe-2026-08-26) |
| `docs/sunat-oficial/04-esquemas-validacion/reglas-validacion-gre-2026-06-20.xlsx` hoja Catálogos | Overlay GRE (cat. 20+19, 61, 65, D-37, 55) |
| `docs/sunat-oficial/01-normativa/anexos-117-2017/anexoVII-117-2017.pdf` | Baseline RS 117-2017 (índice cat. 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12…) |
| `docs/sunat-oficial/01-normativa/RS-340-2017-anexos.zip` | anexoVIIa-d in RS-340-2017-anexos.zip are Anexo VI field matrices (UBL tags), not Anexo VII code tables. Code tables come from CPE/GRE validation XLSX + anexoVII-117 PDF. |

### Contenido de `RS-340-2017-anexos.zip`

```
anexoI-340-2017.pdf
anexoII-340-2017.pdf
anexoIII-340-2017.pdf
anexoIV-340-2017.pdf
anexoIX-340-2017.pdf
anexoV-340-2017.pdf
anexoVIa-340-2017.pdf
anexoVIb-340-2017.pdf
anexoVIc-340-2017.pdf
anexoVId-340-2017.pdf
anexoVIg-340-2017.pdf
anexoVIIa-340-2017.pdf
anexoVIIb-340-2017.pdf
anexoVIIc-340-2017.pdf
anexoVIId-340-2017.pdf
anexoVIII-340-2017.pdf
anexoX-340-2017.pdf
```

## Inventario

### Completos (tabla SUNAT extractable)

| Archivo | Cat. | Ítems | Nombre |
| --- | --- | ---: | --- |
| `01-document-types.json` | 01 | 41 | Código de tipo de documento |
| `05-tax.json` | 05 | 10 | Código de tipos de tributos y otros conceptos |
| `06-identity-document.json` | 06 | 13 | Código de tipo de documento de identidad |
| `07-affectation.json` | 07 | 19 | Código de tipo de afectación del IGV |
| `08-isc-system.json` | 08 | 3 | Código de tipos de sistema de cálculo del ISC |
| `09-credit-note-type.json` | 09 | 13 | Códigos de tipo de nota de crédito electrónica |
| `10-debit-note-type.json` | 10 | 6 | Códigos de tipo de nota de débito electrónica |
| `11-summary-sale-value.json` | 11 | 9 | Códigos de tipo de valor de venta (Resumen diario de boletas y notas) |
| `12-related-tax-document.json` | 12 | 11 | Código de documentos relacionados tributarios |
| `14-other-tax-concepts.json` | 14 | 12 | Código de otros conceptos tributarios |
| `15-additional-elements.json` | 15 | 45 | Códigos de elementos adicionales en la factura y boleta electrónica |
| `16-price-type.json` | 16 | 3 | Código de tipo de precio de venta unitario |
| `17-operation-type-ubl20.json` | 17 | 20 | Código de tipo de operación |
| `18-transport-mode.json` | 18 | 2 | Código de modalidad de transporte |
| `19-summary-item-status.json` | 19 | 3 | Código de estado del ítem (resumen diario) |
| `20-transfer-reason.json` | 20 | 14 | Código de motivo de traslado |
| `21-gre-related-document.json` | 21 | 6 | Código de documentos relacionados (sólo guía de remisión electrónica) |
| `22-perception-regime.json` | 22 | 3 | Código de regimen de percepciones |
| `23-retention-regime.json` | 23 | 2 | Código de regimen de retenciones |
| `24-public-service-tariff.json` | 24 | 49 | Código de tarifa de servicios públicos |
| `26-loan-type.json` | 26 | 3 | Tipo de préstamo (créditos hipotecarios) |
| `27-first-home-indicator.json` | 27 | 4 | Indicador de primera vivienda |
| `51-operation-type.json` | 51 | 31 | Código de tipo de operación |
| `52-legends.json` | 52 | 15 | Códigos de leyendas |
| `53-charge-discount.json` | 53 | 22 | Códigos de cargos, descuentos y otras deducciones |
| `54-detraction-goods.json` | 54 | 44 | Códigos de bienes y servicios sujetos a detracciones |
| `55-tax-concept-id.json` | 55 | 120 | Código de identificación del concepto tributario |
| `56-public-service-type.json` | 56 | 7 | Código de tipo de servicio público |
| `57-telecom-service-type.json` | 57 | 4 | Código de tipo de servicio públicos - telecomunicaciones |
| `58-electricity-meter-type.json` | 58 | 2 | Código de tipo de medidor (recibo de luz) |
| `59-payment-means.json` | 59 | 22 | Medios de Pago |
| `60-address-type.json` | 60 | 5 | Código de tipo de dirección |
| `61-transport-related-document.json` | 61 | 31 | Documentos relacionados aplicables a las GRE (versión 2.0) |
| `63-peru-ports.json` | 63 | 21 | Puertos del Perú |
| `64-peru-airports.json` | 64 | 31 | Aeropuertos del Perú |
| `65-gre-unit-of-measure.json` | 65 | 276 | Código de unidades de medida (para uso solo para la GRE en DAM o DS) |
| `25.2-sunat-product-25-2.json` | 25.2 | 15 | Código de producto SUNAT |
| `25.3-sunat-product-25-3.json` | 25.3 | 14 | Código de producto SUNAT |
| `D-37-special-transport-authorization.json` | D-37 | 13 | Entidades que emiten autorizaciones especiales para el traslado |

### Semilla / parcial (ISO u otra lista externa no enumerada en Anexo)

| Archivo | Cat. | Ítems | Nombre |
| --- | --- | ---: | --- |
| `02-currency.json` | 02 | 3 | Código de tipo de monedas |
| `03-unit-of-measure.json` | 03 | 14 | Código de tipo de unidad de medida comercial |
| `04-country.json` | 04 | 11 | Código de país |

### Faltantes (referenciados sin lista embebida)

| Archivo | Cat. | Ítems | Nombre |
| --- | --- | ---: | --- |
| `13-ubigeo.json` | 13 | 0 | Código de ubicación geográfica (UBIGEO) |
| `25-sunat-product.json` | 25 | 0 | Código de producto SUNAT |
| `62-normalized-goods.json` | 62 | 0 | Bienes normalizados |
| `25.1-sunat-product-25-1.json` | 25.1 | 0 | Código de producto SUNAT |

## MVP mínimo cubierto

| Cat. | Archivo | Estado |
| --- | --- | --- |
| 01 | `01-document-types.json` | full |
| 02 | `02-currency.json` | seed (PEN/USD/EUR) |
| 03 | `03-unit-of-measure.json` | seed (+ ver `65-gre-unit-of-measure.json`) |
| 05 | `05-tax.json` | full |
| 06 | `06-identity-document.json` | full |
| 07 | `07-affectation.json` | full |
| 09 | `09-credit-note-type.json` | full |
| 10 | `10-debit-note-type.json` | full |
| 18 | `18-transport-mode.json` | full |
| 20 | `20-transfer-reason.json` | full (GRE overlay incl. 19) |
| 51 | `51-operation-type.json` | full |

## Re-exportar

```bash
python docs/planificacion/artifacts/catalogs/export_from_sunat.py
```

Requiere: `pypdf`, `openpyxl`.
