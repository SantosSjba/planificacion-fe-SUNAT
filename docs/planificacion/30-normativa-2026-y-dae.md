# 30 — Normativa 2026 (RS-075 / RS-108) y estado DAE

Clasificación de las resoluciones 2026 capturadas en `docs/sunat-oficial/01-normativa/` y decisión sobre DAE.  
Extracción: texto de primeras páginas vía lector PDF del workspace (2026-09-17).

## 1. RS-075-2026/SUNAT

| Campo | Valor |
| --- | --- |
| Archivo | `01-normativa/RS-075-2026.pdf` (5 págs.) |
| Título | *Modifica la normativa referida a la designación de emisores electrónicos del Sistema de Emisión Electrónica y de obligados a usar el Sistema Integrado de Registros Electrónicos* |
| Fecha | Lima, 29 de abril de 2026; vigencia **1 de junio de 2026** |
| Modifica | RS 155-2017, RS 279-2019, RS 000112-2021 (SIRE) |

### Qué hace

- Adelanta la designación como emisor electrónico del SEE:
  - Nuevos inscritos RUC (MYPE / RER / Régimen General): desde el **día de inscripción** (ya no el 3.er mes).
  - Quienes dejan el Nuevo RUS: desde el **1.er día del mes siguiente**.
- Alinea la obligación de llevar RVIE/RCE vía **SIRE** con esa designación anticipada (incisos f/h del art. 3 RS 112-2021).
- Disposiciones transitorias: si la designación no operó al 31-may-2026, opera el **1-jun-2026**.

### Impacto FACTOSYS MVP

| Severidad | `watch` |
| --- | --- |
| Motivo | No cambia contrato XML/SOAP/REST ni catálogos de emisión. Sí cambia **quién está obligado** a emitir electrónicamente y a usar SIRE desde jun-2026. |
| Acción MVP | Ningún cambio de API. Documentar en onboarding/comercial que más contribuyentes entran al SEE/SIRE de inmediato. Revisar timeline SIRE (v2) ante masificación. |

## 2. RS-108-2026/SUNAT

| Campo | Valor |
| --- | --- |
| Archivo | `01-normativa/RS-108-2026.pdf` (publicación El Peruano, ~11 págs. del extracto) |
| Título | *Resolución de Superintendencia que modifica los sujetos obligados a emitir la guía de remisión remitente, incorpora un documento relacionado con el traslado de mercancía extranjera, establece nuevos supuestos para emitir la guía de remisión electrónica por evento y otros* |
| Fecha | Lima, 29 de mayo de 2026 (publicada 31-may-2026) |
| Modifica | RCP (RS 007-99), RS 188-2010, RS 097-2012, RS 255-2015, RS 000123-2022 |

### Qué hace (resumen)

- Ajusta quién debe emitir **GRE remitente** en comercio exterior (deja de forzar a la agencia de aduanas cuando no participa en el transporte terrestre nacional).
- Incorpora como documento relacionado la **“Cita u Orden de Entrega de Mercancías del Terminal Portuario”** para traslado de mercancía extranjera puerto/aeropuerto → almacén / zona primaria.
- Exige consignar **fecha de inicio de traslado** en supuestos donde el transportista está exceptuado de emitir GRE-transportista.
- Amplía excepciones / supuestos de **GRE por evento** y precisions en anexos 097-2012 y 123-2022.

### Impacto FACTOSYS MVP

| Severidad | `watch` |
| --- | --- |
| Motivo | Afecta reglas de negocio GRE (sujetos, docs relacionados, evento), no el camino feliz mínimo GRE 09/31 del MVP. |
| Acción MVP | Mantener GRE v1 con casos básicos. Backlog GRE: catálogo docs relacionados (cita/orden terminal), fecha inicio traslado en excepciones, GRE-por-evento. Releer RS 123-2022 + anexo tras esta RS. |

## 3. DAE — estado en biblioteca

| Hecho | Detalle |
| --- | --- |
| Citado en | `03-matriz-documentos-y-mvp.md` (capa especiales + fila v3) |
| PDF en `sunat-oficial` | **Ninguno** (auditoría `25-auditoria-cobertura-sunat.md`: HUÉRFANO) |
| Decisión | **Sin biblioteca; fuera hasta capturar.** Quitar de la fila v3 como “Evaluar”; no planificar DAE hasta tener norma/guía/manual en la biblioteca. |
| Relacionado capturado | `servicios-web-disponibles-ddjj-boletos-aereos.pdf` y reglas boletos aéreos / contingencia — **no** sustituyen DAE. |

## 4. Insumo para diccionarios (datos tributarios)

Usar como input de campos recomendados / mapeo JSON↔UBL:

- `docs/sunat-oficial/02-guias-xml/guia-datos-tributarios-recomendados-v1.0.pdf`

Complementa las guías XML por documento y los diccionarios 11–15 y 18–20. No reemplaza Anexo VII (códigos) ni Excel de reglas 2026.

## 5. Resumen rápido

| Norma / tema | Impacto MVP | Notas |
| --- | --- | --- |
| RS-075-2026 | `watch` | Designación emisores + SIRE; vigencia 1-jun-2026 |
| RS-108-2026 | `watch` | GRE remitente / docs relacionados / evento |
| DAE | fuera | Sin PDF; sacar de v3 hasta capturar |
| Guía datos tributarios | input dicts | Citar en recursos documentarios |
