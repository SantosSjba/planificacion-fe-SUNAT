# 03 — Matriz de documentos y MVP

## 1. Capas del producto

| Capa | Qué resuelve |
| --- | --- |
| Emisión CPE | Factura, boleta, notas |
| Ciclo de vida | Baja, resumen diario, reintentos, correlativos |
| Logística | GRE remitente / transportista |
| Consulta | Validez, CDR, estado de envío |
| Representación | PDF / representación impresa |
| Cierre tributario | SIRE (post-MVP) |
| Especiales | Percepción, retención, SSPP, boletos aéreos (DAE: sin biblioteca; fuera hasta capturar) |

## 2. Matriz por versión

| Código | Documento | Canal SUNAT | v1 (MVP) | v2 | v3 | Fuente documental principal |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Factura | SOAP `SendBill` | Sí | — | — | Guía XML factura 2.1 + Manual programador |
| 03 | Boleta | SOAP + RC | Sí | — | — | Guía XML boleta 2.1 + Guía resumen |
| 07 | Nota de crédito | SOAP | Sí | — | — | Guía XML NC 2.1 |
| 08 | Nota de débito | SOAP | Sí | — | — | Guía XML ND 2.1 |
| RA | Comunicación de baja | SOAP `SendSummary` | Sí | — | — | Guía comunicación de baja |
| RC | Resumen diario boletas/notas | SOAP `SendSummary` | Sí | — | — | Guía resumen diario |
| 09 | GRE remitente | REST GRE | Sí | — | — | Manual servicios GRE + RS 123-2022 |
| 31 | GRE transportista | REST GRE | Parcial* | Completo | — | Manual GRE + anexo 123-2022 |
| — | Consulta validez | REST | Sí | — | — | Manual consulta integrada |
| — | Consulta CDR / ticket | SOAP/REST | Sí | — | — | Manual programador + GRE |
| — | PDF / RI | Interno | Sí (básico) | Mejorado | — | Requisitos de representación impresa en anexos |
| — | Webhooks de estado | Interno | Sí | — | — | Producto |
| — | Pre-validación XSD+reglas | Interno | Sí | — | — | XSD/XSL + Excel reglas 2026 |
| — | Consola admin (RBAC) | Interno | **MVP+** (S10–S11) | — | — | [32](32-backlog-sprints-mvp.md) · [33](33-console-ui-y-rbac.md) |
| 20 | Retención | SOAP otros CPE | No | Sí | — | Guía XML retención |
| 40 | Percepción | SOAP otros CPE | No | Sí | — | Guía XML percepción |
| — | SIRE Ventas (RVIE) | REST SIRE | No | Sí | — | Manual API SIRE Ventas v30 |
| — | SIRE Compras (RCE) | REST SIRE | No | Sí | — | Manual API SIRE Compras v28 |
| — | Confirmación / conformidad | REST | No | Parcial | Sí | Manual plataforma confirmación |
| — | SSPP / recibos servicios públicos | REST/XML | No | No | Sí | Reglas SSPP + guía token |
| — | Boletos aéreos / contingencia | Varios | No | No | Evaluar | Manual WSDL + reglas boletos; guía contingencia |
| — | DAE | — | No | No | **Fuera** (sin biblioteca; fuera hasta capturar) | Ver [30-normativa-2026-y-dae.md](30-normativa-2026-y-dae.md) |

\* **GRE transportista en v1:** emitir y consultar estado; catálogos y casos borde se endurecen en v2.

## 3. MVP v1 — definición operativa

Un integrador debe poder, solo con la API v1:

1. Registrar una empresa (RUC) con certificado y credenciales SOL (almacenadas cifradas).
2. Emitir factura 01 y recibir estado + XML + CDR.
3. Emitir boleta 03 y generar/enviar resumen diario RC.
4. Emitir notas 07/08 vinculadas.
5. Dar de baja (RA) facturas/notas según reglas.
6. Emitir GRE 09 (y 31 básico) por REST.
7. Consultar validez de un CPE.
8. Recibir webhook cuando cambie el estado (aceptado / observado / rechazado / ticket resuelto).
9. Descargar PDF básico de representación.

### 3.1 MVP+ consola (sprints S10–S11)

Tras el DoD API (sprint S9), la consola permite lo mismo vía UI con RBAC ([33](33-console-ui-y-rbac.md)). **No bloquea** integradores API-first.

## 4. Fuera de MVP (explícito)

- Homologación como OSE.
- Portal contable completo / POS / inventario.
- Cálculo fiscal de negocio del cliente (solo validamos consistencia tributaria del CPE).
- SSO/SAML / forgot-password self-service (console MVP usa JWT + invite).
- Multi-país.

## 5. Estados internos unificados (todos los documentos)

| Estado FACTOSYS | Significado |
| --- | --- |
| `draft` | Recibido, aún no firmado/enviado |
| `validated` | Pasó pre-validación local |
| `queued` | En cola de envío |
| `sent` | Enviado a SUNAT; esperando CDR o ticket |
| `ticket_pending` | Asíncrono: hay ticket (`SendSummary` / GRE) |
| `accepted` | CDR aceptada |
| `accepted_with_observation` | CDR aceptada con observación |
| `rejected` | CDR o pre-validación rechazada |
| `failed` | Error técnico (red, SOAP fault, timeout) — reintentable |
| `cancelled` | Baja comunicada y aceptada (cuando aplique) |

## 6. Dependencias entre documentos

```
Factura 01 ──────────────► Nota 07/08
Boleta 03 ──► RC (resumen) ► Nota 07/08 (vía resumen / vínculo)
CPE 01/07/08 ─────────────► RA (baja)
Traslado de bienes ───────► GRE 09/31 (CDR antes del viaje)
Emisiones del periodo ────► SIRE (v2)
```
