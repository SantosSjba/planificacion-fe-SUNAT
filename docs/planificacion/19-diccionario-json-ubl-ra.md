# 19 — Diccionario JSON ↔ UBL (Comunicación de Baja RA)

Raíz UBL: **`VoidedDocuments`** (UBL 2.0).  
Canal: SOAP **`SendSummary`** → ticket → **`getStatus`** → CDR.  
Nombre archivo: `{RUC}-RA-{YYYYMMDD}-{correlativo}`.

Fuentes: Guía XML Comunicación de Baja + Manual del Programador.

Endpoint: `POST /voided-documents`.

## 1. Reglas de negocio (producto)

| Caso | Regla |
| --- | --- |
| Factura / NC / ND afectadas | Solo si ya tienen **CDR aceptada**; plazo típico ≤ 72 h desde día siguiente del CDR (verificar norma vigente) |
| Boleta | Puede usarse para numeración informada o no (según guía); a menudo la anulación operativa va por **RC estado 3** |
| Contenido | Relación de comprobantes **numerados pero no otorgados** al adquirente |
| Asíncrono | Respuesta inicial `ticket_pending` |

FACTOSYS debe rechazar en pre-validación si el documento referenciado no está `accepted` (facturas) o viola plazo.

## 2. Metadatos

| JSON path | Req | UBL / nota |
| --- | --- | --- |
| `company_id` | required | Emisor |
| `reference_date` | required | `cbc:ReferenceDate` — fecha de emisión de los docs dados de baja |
| `issue_date` | optional | `cbc:IssueDate` — default hoy (fecha generación RA) |
| `correlative` | optional | Sufijo del ID `RA-YYYYMMDD-#####`; si omite, FACTOSYS asigna |

ID generado: `RA-{reference o issue compact}-{correlative}` según reglas del nombre de archivo SUNAT (motor alinea ID XML = nombre).

## 3. Líneas (`documents[]`)

| JSON path | Req | Tag / campo guía |
| --- | --- | --- |
| `documents[].line_id` | optional | Nº ítem (auto 1..n) |
| `documents[].document_type` | required | Cat. 01 (`01`,`07`,`08`,…) |
| `documents[].serie` | required | Serie del comprobante |
| `documents[].number` | required | Correlativo |
| `documents[].reason` | required | Motivo de baja |

Alternativa aceptada: `serie_number: "F001-00000015"` parseado a serie/número.

## 4. Emisor

Hidratar desde `company_id` → `AccountingSupplierParty` (RUC + razón social).

## 5. Flujo FACTOSYS

```
POST /voided-documents
  → validate docs referenciados
  → build VoidedDocuments
  → sign + zip
  → SendSummary
  → status=ticket_pending + sunat_ticket
  → worker getStatus
  → accepted|rejected + webhook
  → marcar documentos origen status=cancelled (si aceptada)
```

## 6. Ejemplo

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "reference_date": "2026-09-15",
  "documents": [
    {
      "document_type": "01",
      "serie_number": "F001-00000099",
      "reason": "Error en datos del cliente; no otorgada"
    },
    {
      "document_type": "07",
      "serie": "F001",
      "number": 100,
      "reason": "Nota emitida por error"
    }
  ]
}
```

## 7. Errores SUNAT frecuentes (RA)

| Código | Tema |
| --- | --- |
| 0127 | Ticket no existe |
| 2220 | ID no coincide con nombre archivo |
| 2223 / 2324 | RA ya presentada |
| 2346 / 2301 | Fechas IssueDate inválidas |
| 2671 | ReferenceDate inválida |

Ver catálogo completo en `16-catalogo-errores.md` + JSON de códigos.
