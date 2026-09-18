# 04 — Recursos documentarios

Inventario de **bases** que sostienen el diseño.  
Archivos físicos: [`../sunat-oficial`](../sunat-oficial).  
Fecha de captura de la biblioteca: **2026-09-17**.

## 1. Capas documentales

| Capa | Qué es | Dónde |
| --- | --- | --- |
| A. Norma | Ley, reglamento, resoluciones | `sunat-oficial/01-normativa` |
| B. Anexos técnicos | Requisitos, catálogos, UBL peruano | `01-normativa/anexos-*` + ZIP 340-2017 |
| C. Guías XML | Mapeo campo ↔ tag UBL | `02-guias-xml` |
| D. Manuales de integración | SOAP/REST, nombres, auth, CDR | `03-manuales-tecnicos` |
| E. Esquemas y reglas | XSD, XSL, Excel de validaciones | `04-esquemas-validacion` |
| F. Plan FACTOSYS | Decisiones de producto | este directorio `planificacion` |
| G. Externos vivos | Portales que hay que re-chequear | sección 5 |

## 2. Mapa capacidad → documento oficial

### Emisión CPE (factura / boleta / notas)

| Necesidad | Documento |
| --- | --- |
| Qué es el SEE del contribuyente | `RS-097-2012-oficial.pdf` |
| SEE-OSE / marco actual | `RS-117-2017-SEE-OSE.pdf` |
| Requisitos factura/boleta/notas | Anexos I–IV en `anexos-117-2017/` + RS 318-2017 anexos |
| Tags UBL 2.1 | Guías XML factura / boleta / NC / ND |
| Envío SOAP, ZIP, CDR, tickets | `manual-del-programador-see-contribuyente.pdf` |
| Endpoints WSDL | `servicios-web-disponibles-ddjj-boletos-aereos.pdf` |
| Catálogos (01, 02, 05, 07, 51…) | `anexoVII-117-2017.pdf` + `RS-340-2017-anexos.zip` |
| Validar antes de enviar | `xsd-ubl.zip`, `xsl-ubl-2.1-*.zip`, `reglas-validacion-cpe-2026-08-26.xlsx` |

### Resumen diario y bajas

| Necesidad | Documento |
| --- | --- |
| Estructura RC | `guia-resumen-diario-boletas-ubl-2.0.pdf` |
| Estructura RA | `guia-xml-comunicacion-baja.pdf` |
| Método `SendSummary` / `getStatus` | Manual del programador |
| Contingencia / impresos | `guia-resumen-comprobantes-impresos-contingencia.pdf` |

### GRE

| Necesidad | Documento |
| --- | --- |
| Norma vigente GRE | `RS-123-2022-guias-remision.pdf` + `RS-123-2022-anexo.pdf` |
| API REST / OAuth2 | `manual-servicios-web-gre.pdf` |
| URLs | `manual-url-gre.xlsx` |
| Reglas de validación GRE | `reglas-validacion-gre-2026-06-20.xlsx` |
| Estructura XML histórica remitente | `guia-xml-guia-remision-remitente.pdf` |
| Base previa GRE | `RS-255-2015-guias-electronicas.pdf` |

### Consultas

| Necesidad | Documento |
| --- | --- |
| Validez REST | `manual-consulta-integrada-validez-cpe.pdf` |
| CDR / estado SOAP | Manual del programador + servicios web disponibles |

### SIRE (v2)

| Necesidad | Documento |
| --- | --- |
| API Ventas | `manual-api-sire-ventas-v30.pdf` |
| API Compras | `manual-api-sire-compras-v28.pdf` |

### OSE / PSE (referencia; no es v1)

| Necesidad | Documento |
| --- | --- |
| Registro PSE | `RS-199-2015-registro-pse.pdf` |
| Homologación / pruebas OSE | Manuales homologación y pruebas OSE |
| Operatividad OSE | `manual-tecnico-operatividad-ose-v5.2-2024-07.docx` |
| Aspectos técnicos OSE→SUNAT | `RS-114-2019-anexo-XIII-*.pdf` |

### Facturador SFS (referencia / validación local)

| Necesidad | Documento |
| --- | --- |
| Instalación / estructuras | `sfs-*` en manuales técnicos |
| Norma SFS | `RS-182-2016-facturador-sfs.pdf` |

## 3. Orden de lectura para diseño

1. Manual del programador (contrato de envío).
2. Guía XML factura 2.1 (modelo canónico).
3. Excel reglas CPE 2026-08-26 (errores y pre-validación).
4. Anexo VII catálogos.
5. Manual GRE REST.
6. Manual consulta integrada.
7. Guía resumen diario + comunicación de baja.
8. (v2) Manuales SIRE.

## 4. Cómo versionar la biblioteca oficial

| Regla | Detalle |
| --- | --- |
| No editar PDFs oficiales | Son evidencia; solo agregar |
| Fecha de captura | Registrar en `sunat-oficial/README.md` al re-sincronizar |
| Changelog de normas | Cuando SUNAT publique reglas nuevas, copiar el Excel/PDF y anotar en un `CHANGELOG-sunat.md` (crear al primer update) |
| Fuente viva | Siempre preferir `cpe.sunat.gob.pe/guias-y-manuales` frente a espejos |

## 5. Recursos externos vivos (re-chequear)

| Recurso | URL |
| --- | --- |
| Portal CPE | https://cpe.sunat.gob.pe |
| Guías y manuales | https://cpe.sunat.gob.pe/guias-y-manuales |
| Orientación / WSDL | https://orientacion.sunat.gob.pe/guias-manuales-y-servicios-web |
| Índice RS | https://www.sunat.gob.pe/legislacion/superin/ |
| UBL OASIS 2.1 | https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.html |
| XMLDSig (W3C) | https://www.w3.org/TR/xmldsig-core1/ |

## 6. Recursos de producto (planificación / código)

| Artefacto | Estado |
| --- | --- |
| OpenAPI FACTOSYS v1 | **DONE** — `artifacts/openapi-v1.yaml` (+ borrador narrativo `08-api-publica-borrador.md`) |
| Diccionario JSON canónico ↔ UBL | **DONE** — docs `11`–`15`, `18`–`20`; schemas en `artifacts/schemas/`; input adicional `guia-datos-tributarios-recomendados-v1.0.pdf` |
| Catálogo de errores FACTOSYS ↔ código SUNAT | **DONE** — `16-catalogo-errores.md` + `artifacts/sunat-codigos-retorno.json` / `.csv` |
| Catálogos SUNAT (códigos) | En curso — `artifacts/catalogs/` (export desde Anexo VII; ver README ahí) |
| Matriz de pruebas beta / fixtures | **DONE** (borrador) — `21-fixtures-sandbox.md` + `artifacts/fixtures/` |
| ADRs | **DONE** — `adr/001`–`005` (correlativos, firma, ubl/sign, webhooks, catálogos) |
| Normativa 2026 + DAE | **DONE** — [30-normativa-2026-y-dae.md](30-normativa-2026-y-dae.md) (RS-075/108 clasificadas; DAE sin biblioteca) |

Referencias oficiales a citar junto a los diccionarios:

- `02-guias-xml/guia-datos-tributarios-recomendados-v1.0.pdf`
- `01-normativa/anexos-117-2017/anexoVII-117-2017.pdf` + `RS-340-2017-anexos.zip`

## 7. Huecos documentales conocidos

| Hueco | Impacto | Mitigación |
| --- | --- | --- |
| Anexos B/C/D RS 117-2017 no como PDF sueltos | Bajo para v1 SEE contribuyente | Cubierto por Anexo XIII RS 114-2019 y manuales OSE si se retoma B |
| Guía XML GRE transportista poco visible | Medio | Usar anexo RS 123-2022 + reglas GRE Excel + manual REST |
| XSD/XSL cambian de nombre en el portal | Medio | Re-descarga periódica desde Guías y Manuales |

## 8. Lista de archivos “críticos” (no perder)

```
manual-del-programador-see-contribuyente.pdf
guia-xml-factura-ubl-2.1.pdf
guia-xml-boleta-ubl-2.1.pdf
guia-xml-nota-credito-ubl-2.1.pdf
guia-xml-nota-debito-ubl-2.1.pdf
guia-resumen-diario-boletas-ubl-2.0.pdf
guia-xml-comunicacion-baja.pdf
manual-servicios-web-gre.pdf
manual-consulta-integrada-validez-cpe.pdf
anexoVII-117-2017.pdf
xsd-ubl.zip
xsl-ubl-2.1-2022-09-06.zip
reglas-validacion-cpe-2026-08-26.xlsx
reglas-validacion-gre-2026-06-20.xlsx
RS-097-2012-oficial.pdf
RS-117-2017-SEE-OSE.pdf
RS-123-2022-guias-remision.pdf
RS-123-2022-anexo.pdf
```
