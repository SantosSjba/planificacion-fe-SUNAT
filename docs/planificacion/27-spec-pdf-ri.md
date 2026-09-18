# 27 — Spec MVP: representación impresa (PDF / RI)

Spec de producto para la **representación impresa** (RI) de CPE emitidos por FACTOSYS.  
Complementa [03-matriz](03-matriz-documentos-y-mvp.md), [05-arquitectura](05-arquitectura.md) §7–8, [06-stack](06-stack-tecnologico.md) (paquete `pdf-ri`, cola `pdf-render`), [08-api](08-api-publica-borrador.md) y OpenAPI `GET /documents/{documentId}/pdf`.

**No es código.** Fuentes normativas: anexos de RI / aspectos técnicos del emisor electrónico (QR, valor resumen), guías XML UBL 2.1, RS 097-2012 y modificatorias; ver biblioteca en `docs/sunat-oficial`.

---

## 1. Objetivo MVP

Entregar un **PDF básico, legible y conforme a campos mínimos** de RI, descargable por API, generado a partir del XML firmado (y metadatos de empresa) — no un diseño de marca ni un motor tipográfico fancy.

El integrador debe poder:

1. Emitir 01/03 (y notas) y, cuando el documento esté en estado apto, obtener `links.pdf`.
2. Abrir el PDF y ver emisor, adquirente, líneas, totales/IGV, serie-número, fecha, hash/digest y QR cuando aplique.
3. Reusar el mismo artefacto en webhook / SDK (`getPdf`) sin regenerar en el cliente.

---

## 2. Tipos de documento en v1 (PDF)

| Código | Documento | PDF en MVP v1 | Notas |
| --- | --- | --- | --- |
| **01** | Factura | **Sí — obligatorio** | Prioridad de implementación #1 |
| **03** | Boleta | **Sí — obligatorio** | Misma plantilla base que 01; denominación “Boleta de venta electrónica” |
| **07** | Nota de crédito | **Sí** | Plantilla NC; debe mostrar CPE modificado (tipo/serie-número) |
| **08** | Nota de débito | **Sí** | Misma familia que NC |
| **09** | GRE remitente | **Diferido a v1.1 / post-MVP PDF** | Emisión GRE sí está en MVP; RI GRE tiene anexos propios (RS 123-2022). No bloquear emisión. |
| **31** | GRE transportista | **Fuera de PDF MVP** | Igual que 09 |
| **RA** | Comunicación de baja | **No** | Artefacto técnico; no RI de venta al adquirente |
| **RC** | Resumen diario | **No** | Idem |

**Decisión de producto:** MVP PDF = **01 + 03 mínimo**; **07/08 incluidos** porque el ciclo de vida de emisión MVP ya los cubre y el adquirente suele pedir la RI de la nota. GRE/RA/RC **sin** `GET …/pdf` útil en v1 (404 o `FACTOSYS_VALIDATION` con mensaje “PDF no aplicable a este tipo” — preferir **404** + `FACTOSYS_NOT_FOUND` semántico de recurso PDF, o código dedicado futuro; ver §7).

---

## 3. Cuándo existe el PDF

| Condición | Comportamiento |
| --- | --- |
| Documento aún sin XML firmado (`draft` / pre-firma) | **404** — no hay RI |
| Firmado pero aún no enviado / en cola | **Opcional:** generar PDF “borrador firmado” o esperar aceptación. **MVP:** generar tras firma exitosa (estado ≥ `validated`/`queued`/`sent`) para no bloquear descarga en demos; marcar en metadatos `pdf_basis: signed_xml` |
| `accepted` / `accepted_with_observation` | PDF canónico disponible |
| `rejected` | PDF **opcional** (útil para soporte). **MVP:** sí generar si hay XML firmado; no es RI “oficial” de venta |
| `cancelled` (baja aceptada) | Mantener último PDF; no regenerar como “anulado” fancy en MVP (texto opcional “Comunicado de baja” en v2) |

Regeneración: si cambia plantilla o se corrige bug, worker puede sobrescribir artefacto; el path S3 versionado o hash en Postgres evita servir basura stale (ver §6).

---

## 4. Campos obligatorios (contenido mínimo RI)

Alineado a **información mínima de representación impresa** de anexos SUNAT (factura/boleta/notas) y a aspectos técnicos del emisor (QR + valor resumen). FACTOSYS no inventa campos: toma del XML firmado + maestro `company`.

### 4.1 Cabecera emisor (siempre)

| Campo | Origen típico | Notas UI |
| --- | --- | --- |
| RUC emisor | XML / company | Prefijo literal **“RUC”** + número |
| Razón social / denominación | company / PartyName | |
| Nombre comercial | company si existe | Solo si está configurado |
| Domicilio fiscal (línea + ubigeo resumido) | company | Una línea basta en MVP |
| Denominación del comprobante | por `document_type` | Ej. “FACTURA ELECTRÓNICA”, “BOLETA DE VENTA ELECTRÓNICA”, “NOTA DE CRÉDITO ELECTRÓNICA”, “NOTA DE DÉBITO ELECTRÓNICA” (sustituye el código 01/03/07/08 en la RI) |
| Tipo (código cat. 01) | XML | Puede ir en tipografía secundaria junto a la denominación |
| Serie-número | `cbc:ID` | Formato visible `F001-00000123` (ceros a la izquierda del correlativo: política producto 8 dígitos en RI) |
| Fecha de emisión | `cbc:IssueDate` | `YYYY-MM-DD` o `DD/MM/YYYY` consistente en toda la RI |
| Moneda | `cbc:DocumentCurrencyCode` | Código + etiqueta corta (PEN / USD) |
| Tipo de operación (opcional MVP) | ProfileID / cat. 51 | Mostrar si viene; no inventar |

### 4.2 Adquirente / usuario

| Campo | Origen | Notas |
| --- | --- | --- |
| Tipo doc. identidad | Customer Party | Catálogo 06 (RUC, DNI, etc.) |
| Número doc. | | |
| Nombre / razón social | | |
| Dirección (si existe en XML) | | Una línea; omitir bloque vacío |

### 4.3 Líneas

Por cada `InvoiceLine` / línea de nota:

| Campo | Obligatorio MVP |
| --- | --- |
| Ítem / # línea | Sí |
| Descripción | Sí |
| Cantidad + unidad (UN/ECE o catálogo) | Sí |
| Valor unitario / precio | Sí (mostrar el que use el XML canónico) |
| Afectación IGV (cat. 07) código o etiqueta corta | Sí |
| IGV / tributo de línea (si aplica) | Sí si gravada |
| Importe de línea | Sí |

Multilínea: paginar PDF si hace falta; **sin** saltos de diseño fancy.

### 4.4 Totales e impuestos

| Campo | Obligatorio |
| --- | --- |
| Operaciones gravadas / exoneradas / inafectas (según existan) | Sí las que vengan en TaxTotal / MonetaryTotal |
| IGV (monto) | Sí si hay gravadas |
| Otros tributos (ISC, etc.) | Solo si presentes en XML (no forzar filas vacías) |
| Importe total | Sí (`TaxInclusiveAmount` / equivalente) |
| Monto en letras | **Fuera de MVP** (nice-to-have v2) |

### 4.5 Notas 07/08 — extras

| Campo | Obligatorio |
| --- | --- |
| Tipo de nota (cat. 09 / 10) | Sí |
| Documento(s) modificado(s): tipo + serie-número (+ fecha si está) | Sí |
| Motivo / descripción de la nota | Sí si existe en XML |

### 4.6 Valor resumen (hash / DigestValue) — **requerido**

| Elemento | Regla MVP |
| --- | --- |
| **DigestValue** (`ds:DigestValue` del XML firmado) | **Obligatorio** en RI de 01/03/07/08 |
| Etiqueta | Texto claro: “Valor resumen” / “Hash” + valor Base64 |
| Ubicación | Pie de página, junto o bajo el QR |

Sin firma válida → no hay DigestValue usable → no servir PDF “como aceptado”; fallar generación con error interno/reintento.

### 4.7 Código QR — **requerido** (anexos aspectos técnicos emisor)

| Aspecto | Spec MVP |
| --- | --- |
| Simbología | QR Code 2005 / ISO/IEC 18004 (como exige SUNAT) |
| Contenido (campos separados por `\|`) | En la medida que existan en el CPE: **RUC emisor \| tipo CPE \| serie \| número \| IGV \| importe total \| fecha emisión \| tipo doc. adquirente \| número doc. adquirente \| DigestValue** |
| Separador final | Incluir el pipe final si el anexo vigente lo exige; **fijar en implementación contra el anexo oficial copiado en `sunat-oficial`** (no inventar variantes) |
| Posición | Parte inferior de la RI |
| Tamaño | Máx. ~6×6 cm (incluye quiet zone); quiet zone ≥ 1 mm |
| Color | Negro sobre fondo blanco |

Si falta un campo opcional del QR (ej. dirección no va en QR), no rellenar con basura: seguir el anexo (omitir o vacío según regla oficial).

### 4.8 Leyendas mínimas

- Indicación de que es un **comprobante electrónico** / representación impresa del CPE.
- En MVP **no** se exige logo SUNAT ni sello “homologado OSE”.
- Texto libre de marketing del cliente: **fuera**.

---

## 5. Principios de layout (MVP)

1. **Una columna, tipografía sobria** (sistema o Noto Sans / similar embebible). Sin Inter-purple ni “dashboard”.
2. **Jerarquía:** denominación del CPE + serie-número arriba a la derecha; emisor a la izquierda.
3. **Tabla de líneas** simple (bordes finos); totales alineados a la derecha debajo.
4. **Pie fijo:** DigestValue + QR + “Representación impresa del CPE”.
5. **A4** por defecto; variante ticket 80 mm **fuera de MVP**.
6. **Idioma:** español.
7. **Datos = XML de verdad:** la RI no recalcula IGV distinto al XML; si hay discrepancia UI, es bug del render.
8. **Sin PII extra:** no imprimir email del adquirente si no está en el CPE.

Wireframe conceptual (no mock visual):

```
[ Razón social / RUC / domicilio ]     [ FACTURA ELECTRÓNICA ]
                                       [ F001-00000123        ]
                                       [ Fecha / Moneda       ]
[ Adquirente: tipo-nro-nombre ]
------------------------------------------------------------
| # | Descripción | Cant | P.U. | IGV | Importe |
------------------------------------------------------------
| Totales / IGV / Total a pagar                            |
------------------------------------------------------------
[ Valor resumen: <DigestValue> ]              [ QR ]
```

---

## 6. Tecnología de generación (puntero)

| Decisión | Detalle |
| --- | --- |
| Stack | HTML plantilla → PDF con **Playwright** (preferido en [06](06-stack-tecnologico.md); Puppeteer aceptable si el spike lo justifica) |
| Package | `packages/pdf-ri` |
| Cola | BullMQ `pdf-render` (no bloquear el request de emisión) |
| Input | XML firmado (+ JSON canónico opcional solo para labels) |
| Output | `application/pdf` bytes → object storage |

**Spike mínimo (post monorepo):** 1 plantilla Invoice gravada → PDF con QR + DigestValue verificado visualmente.

No usar motores de facturación de terceros ni PDF “form fill” SUNAT.

---

## 7. Almacenamiento

| Qué | Dónde |
| --- | --- |
| Bytes PDF | S3-compatible (MinIO local); key sugerida `org/{org}/company/{ruc}/documents/{id}/ri.pdf` |
| Metadatos | Postgres `document_artifacts`: `kind=pdf`, `content_type`, `sha256`, `bytes`, `created_at`, `template_version` |
| Retención | Igual que XML/CDR ([07-seguridad](07-seguridad-y-cumplimiento.md)); no borrar PDF si el documento existe |

`template_version` (semver o fecha) permite regenerar flota cuando cambie el anexo QR.

---

## 8. `GET /v1/documents/{id}/pdf` — comportamiento

Contrato: OpenAPI `getDocumentPdf`.

| Caso | HTTP | Body / headers |
| --- | --- | --- |
| OK, PDF listo | **200** | `Content-Type: application/pdf`; `Content-Disposition: attachment; filename="{ruc}-{tipo}-{serie}-{numero}.pdf"` |
| Documento inexistente / otro tenant | **404** | Error FACTOSYS (`FACTOSYS_NOT_FOUND`) |
| Tipo sin RI (RA/RC/GRE en v1) | **404** o **422** | Preferencia MVP: **422** `FACTOSYS_VALIDATION` + message “PDF no soportado para este tipo en v1” |
| Aún no firmado | **404** / **409** | Preferencia: **409** con message “PDF no disponible aún” **o** 404; **elegir 404** para simplicidad SDK si no hay artefacto |
| Generación en curso | **202** o **404** + Retry-After | **MVP:** worker síncrono en primer GET si falta artefacto (timeout corto) **o** 404 hasta que el job termine; documentar en OpenAPI la opción elegida al implementar. Recomendación: **lazy generate en GET** con lock Redis ≤ 30s |
| Error de render | **500** | `FACTOSYS_INTERNAL`; reintentable |

Auth: misma API key / scope que `GET /documents/{id}/xml`.

Idempotencia: GET puro; no crea documento nuevo.

Link en recurso `Document.links.pdf` y en webhook `document.status_changed` (ver 08).

---

## 9. Fuera de MVP (diseño fancy y más)

Explicitamente **NO** en v1:

- Temas por empresa, logos grandes, colores de marca, CSS custom del cliente.
- Plantillas Word/Excel, multipágina “brochure”, marcas de agua premium.
- Ticket térmico, email HTML embebido, WhatsApp share card.
- Monto en letras, leyendas legales largas configurables, multi-idioma.
- PDF/A-3 con XML embebido (evaluar v2).
- RI de GRE 09/31, RA, RC.
- Editor visual de plantillas en consola.
- Firma electrónica visible tipo sello PNG del certificado (solo DigestValue + QR).
- Códigos de barras 1D adicionales.

v2 “PDF mejorado” (matriz 03): branding ligero (logo + color primario) y GRE RI.

---

## 10. Criterios de aceptación MVP

- [ ] Fixture `01-invoice-gravada` → PDF con RUC, razón social, denominación Factura electrónica, serie-número, fecha, adquirente, 1 línea, totales, IGV, DigestValue, QR escaneable.
- [ ] Fixture `03-receipt-dni` → denominación Boleta + mismos bloques.
- [ ] Fixture NC/ND → muestra documento modificado.
- [ ] `GET …/pdf` 200 con `application/pdf` tras firma.
- [ ] Artefacto en S3 + fila en `document_artifacts`.
- [ ] RA/RC/GRE no exponen PDF útil (error claro).
- [ ] Contenido del QR contrastado contra anexo oficial vigente en `sunat-oficial` (checklist en PR).

---

## 11. Relación con otros docs

| Doc | Relación |
| --- | --- |
| 03 | PDF RI = Sí (básico) en MVP |
| 06 | Playwright + `pdf-ri` + cola |
| 08 / OpenAPI | Path y links |
| 17 SDKs | `getPdf` |
| 25 auditoría | Cierra hueco P1 “Spec PDF/RI” |
| 24 spikes | No bloquea A–C; implementar tras builder+firma |
