# 20 — Diccionario JSON ↔ UBL (Resumen Diario RC)

Raíz UBL: **`SummaryDocuments`** (UBL 2.0, CustomizationID **1.1** vigente desde 2018).  
Canal: SOAP **`SendSummary`** → ticket → **`getStatus`**.  
Nombre: `{RUC}-RC-{YYYYMMDD}-{correlativo}`.

Moneda del resumen: **PEN** (regla de la guía).

Endpoint: `POST /daily-summaries`.

## 1. Para qué sirve

Informar a SUNAT las **boletas (03)** y **notas 07/08 vinculadas a boleta** emitidas en una fecha, a más tardar el **7.º día calendario** desde el día siguiente a la emisión (Anexo 05-A / guía).

Estados por línea (catálogo ítem):

| Código | Nombre | Uso |
| --- | --- | --- |
| `1` | Adicionar | Primera información del comprobante |
| `2` | Modificar | Corregir datos ya informados (no cambia tipo/serie/número) |
| `3` | Anulado | Baja de boleta/nota no otorgada (vía RC) |

## 2. Metadatos FACTOSYS

| JSON path | Req | Nota |
| --- | --- | --- |
| `company_id` | required | |
| `reference_date` | required | Fecha de emisión de las boletas/notas informadas |
| `issue_date` | optional | Fecha generación del RC (default hoy) |
| `correlative` | optional | Sufijo RC |
| `document_ids` | optional uuid[] | Si omite: toma pool `pending_summary` de ese día |
| `lines` | optional | Override manual (avanzado); normal = auto desde documentos |

## 3. Línea de resumen (si se arma a mano o respuesta interna)

| JSON path | Req | UBL / guía |
| --- | --- | --- |
| `lines[].line_id` | auto | `cbc:LineID` |
| `lines[].document_type` | required | `03`\|`07`\|`08` |
| `lines[].serie_number` | required | Serie B + correlativo |
| `lines[].status` | required | `1`\|`2`\|`3` → `ConditionCode` |
| `lines[].customer.identity_type` | required | Cat. 06 |
| `lines[].customer.identity_number` | required | |
| `lines[].totals.gravadas` | required* | BillingPayment / valor venta |
| `lines[].totals.exoneradas` | required* | |
| `lines[].totals.inafectas` | required* | |
| `lines[].totals.gratuitas` | optional | |
| `lines[].totals.igv` | required | |
| `lines[].totals.isc` | optional | |
| `lines[].totals.other_charges` | optional | |
| `lines[].totals.other_taxes` | optional | |
| `lines[].totals.payable` | required | `sac:TotalAmount` |
| `lines[].affected_document` | conditional | Si NC/ND: tipo+serie+número boleta/ticket |
| `lines[].perception` | optional | Régimen, base, monto, total con percepción |

\*En `totals_mode` del documento origen FACTOSYS ya calculó; el RC solo consolida.

## 4. Modo recomendado (DX)

El integrador **no** arma líneas del RC:

```json
{
  "company_id": "…",
  "reference_date": "2026-09-17"
}
```

FACTOSYS:

1. Selecciona boletas/NC/ND con `include_in_daily_summary` y `summary_status=pending`.
2. Genera líneas status=`1`.
3. Envía RC, actualiza `summary_status` de cada doc.

Para anular boleta no otorgada vía RC:

```json
{
  "company_id": "…",
  "reference_date": "2026-09-17",
  "lines": [
    {
      "document_id": "uuid-boleta",
      "status": "3"
    }
  ]
}
```

## 5. Flujo

```
Boletas/NC/ND del día → pool pending
POST /daily-summaries
  → SummaryDocuments
  → SendSummary
  → ticket_pending
  → CDR
  → summary_status=accepted|rejected en cada doc
  → webhook document.status_changed (+ evento summary si se define)
```

## 6. Ejemplo auto

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "reference_date": "2026-09-17"
}
```

## 7. Errores frecuentes (RC)

| Código | Tema |
| --- | --- |
| 0127 | Ticket inexistente |
| 2220 | ID ≠ nombre archivo |
| 2223 | RC ya presentado |
| 2236 / 2346 | Fechas |
| 2072 / 2074 / 2075 | Customization / UBL version |

## 8. Relación con boleta (diccionario 13)

| Campo boleta | Efecto |
| --- | --- |
| `include_in_daily_summary: true` | Entra al pool |
| `send_individually: true` | Puede no requerir RC (según reglas vigentes); documentar por company |
| `summary_status` | Lectura en `GET /documents/{id}` |
