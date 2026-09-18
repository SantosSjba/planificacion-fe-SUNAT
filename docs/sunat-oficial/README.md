# Biblioteca oficial SUNAT

Documentos públicos descargados el **17 de septiembre de 2026** desde `cpe.sunat.gob.pe`, `www.sunat.gob.pe`, `orientacion.sunat.gob.pe` y `contenido.app.sunat.gob.pe`.

No son copias interpretadas: son los PDF, ZIP, XLSX y DOCX oficiales. El listado de URLs encontradas al scrapear portales está en [`_scraped-links.txt`](_scraped-links.txt).

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `01-normativa` | Ley, reglamento y resoluciones de superintendencia |
| `01-normativa/anexos-117-2017` | Anexos técnicos de la RS 117-2017/SUNAT (SEE-OSE) |
| `02-guias-xml` | Guías de elaboración XML / UBL por tipo de documento |
| `03-manuales-tecnicos` | Manual del programador, GRE, SIRE, OSE, SFS, consultas |
| `04-esquemas-validacion` | XSD, XSL y reglas de validación vigentes |

## 1. Normativa

### Marco general

| Archivo | Para qué sirve |
| --- | --- |
| `Ley-25632-marco-comprobantes-pago.pdf` | Ley Marco de Comprobantes de Pago |
| `RS-007-1999-reglamento-comprobantes-pago.pdf` | Reglamento de Comprobantes de Pago |
| `RS-188-2010-factura-electronica.pdf` | Primera ampliación del SEE a factura y documentos vinculados |
| `RS-097-2012-oficial.pdf` | Crea el SEE desarrollado desde los sistemas del contribuyente |
| `RS-097-2012-SEE-contribuyente.pdf` | Cuadernillo / versión resumida de la RS 097-2012 |
| `RS-097-2012-anexos.zip` | Anexos originales 1–10 de la RS 097-2012 |

### Sistemas de emisión

| Archivo | Para qué sirve |
| --- | --- |
| `RS-117-2017-SEE-OSE.pdf` | Aprueba el SEE-OSE |
| `RS-117-2017-fe-erratas.pdf` | Fe de erratas de la RS 117-2017 |
| `RS-182-2016-facturador-sfs.pdf` | Sistema Facturador SUNAT (SFS) |
| `RS-199-2015-registro-pse.pdf` | Registro de Proveedores de Servicios Electrónicos |
| `RS-255-2015-guias-electronicas.pdf` | Régimen de guías de remisión electrónicas |
| `RS-300-2014.pdf` | Sistema de emisión electrónica y documentos relacionados |
| `RS-318-2017.pdf` y anexos | Sustituye anexos de factura, boleta, notas y catálogos |
| `RS-340-2017.pdf` | Ajustes a CPE y documentos electrónicos |
| `RS-340-2017-anexos.zip` | Anexos / catálogos actualizados de 2017 |

### Guías de remisión y OSE posteriores

| Archivo | Para qué sirve |
| --- | --- |
| `RS-123-2022-guias-remision.pdf` | Reforma de GRE y designación de emisores |
| `RS-123-2022-anexo.pdf` | Anexo técnico vigente de GRE / catálogos asociados |
| `RS-114-2019.pdf` | Ajustes al SEE-OSE |
| `RS-114-2019-anexo-XIII-aspectos-tecnicos-OSE.pdf` | Anexo XIII-2-C: envío OSE → SUNAT (`SendBill`, `SendSummary`, `SendPack`) |
| `RS-114-2019-anexo-XIII-1-B.pdf` | Anexo XIII-1-B: aspectos técnicos del emisor |
| `RS-108-2026.pdf` | GRE remitente / docs relacionados mercancía extranjera / GRE por evento — ver plan `30` (`watch`) |
| `RS-075-2026.pdf` | Designación emisores electrónicos + SIRE (vigencia 1-jun-2026) — ver plan `30` (`watch`) |

### Anexos RS 117-2017 (carpeta `anexos-117-2017`)

Los anexos B, C y D no están publicados como PDF sueltos con ese nombre. El **Anexo A** sí está. Los anexos romanos I–XVII cubren requisitos de factura, boleta, notas, catálogos (Anexo VII = catálogo de códigos), estándar UBL y documentos relacionados.

## 2. Guías XML / UBL

Usar **UBL 2.1** para factura, boleta y notas. Resumen diario y comunicación de baja siguen **UBL 2.0**. Percepción, retención y GRE histórica usan esquemas propios o UBL 2.0.

| Archivo | Documento | Raíz XML |
| --- | --- | --- |
| `guia-xml-factura-ubl-2.1.pdf` | Factura (01) | `Invoice` |
| `guia-xml-boleta-ubl-2.1.pdf` | Boleta (03) | `Invoice` |
| `guia-xml-nota-credito-ubl-2.1.pdf` | Nota de crédito (07) | `CreditNote` |
| `guia-xml-nota-debito-ubl-2.1.pdf` | Nota de débito (08) | `DebitNote` |
| `guia-resumen-diario-boletas-ubl-2.0.pdf` | Resumen diario (RC) | `SummaryDocuments` |
| `guia-xml-comunicacion-baja.pdf` | Comunicación de baja (RA) | `VoidedDocuments` |
| `guia-xml-guia-remision-remitente.pdf` | GRE remitente (histórica) | `DespatchAdvice` |
| `guia-xml-comprobante-percepcion-v1.0.pdf` | Percepción | `Perception` |
| `guia-xml-comprobante-retencion-v1.2.pdf` | Retención | `Retention` |
| `guia-resumen-comprobantes-impresos-contingencia.pdf` | Resumen de contingencia | — |
| `guia-datos-tributarios-recomendados-v1.0.pdf` | Campos tributarios recomendados | — |

## 3. Manuales técnicos

### Núcleo para una API de emisión

| Archivo | Uso |
| --- | --- |
| `manual-del-programador-see-contribuyente.pdf` | Nombres ZIP/XML, SOAP, WS-Security, CDR, tickets, ambientes beta/producción |
| `servicios-web-disponibles-ddjj-boletos-aereos.pdf` | WSDL y endpoints vigentes, incluye DDJJ de boletos aéreos |
| `manual-servicios-web-gre.pdf` | API REST GRE: OAuth2, envío, tickets, errores HTTP |
| `manual-url-gre.xlsx` | URLs/endpoints GRE |
| `manual-consulta-integrada-validez-cpe.pdf` | API REST `validarcomprobante` |
| `manual-api-sire-ventas-v30.pdf` | API SIRE Ventas vigente |
| `manual-api-sire-ventas-v25.pdf` | Versión anterior de SIRE Ventas (referencia) |
| `manual-api-sire-compras-v28.pdf` | API SIRE Compras |

### OSE / PSE y SFS

| Archivo | Uso |
| --- | --- |
| `manual-homologacion-ose-2017.pdf` | Homologación de un OSE |
| `manual-pruebas-pre-postulante-ose.pdf` | Pruebas previas a postular como OSE |
| `manual-pruebas-ose-calificados.pdf` | Pruebas de OSE ya calificado |
| `manual-tecnico-operatividad-ose-v5.2-2024-07.docx` | Operatividad técnica OSE (v5.2, jul 2024) |
| `otros-aspectos-interes-ose.pdf` | Seguridad y operación OSE |
| `manual-plataforma-confirmacion-cpe.docx` | Plataforma de confirmación de CPE |
| `sfs-*.pdf` / `sfs-estructuras.xlsx` | Facturador SUNAT: instalación, TXT/JSON/XML plano |

## 4. Esquemas y reglas de validación

Estos archivos son la fuente de verdad para un motor de validación propio.

| Archivo | Fecha / versión |
| --- | --- |
| `xsd-ubl.zip` | XSD UBL 2.1 (paquete oficial CPE) |
| `xsl-ubl-2.1-2022-09-06.zip` | XSL 2.1 actualizado al 06/09/2022 |
| `xsl-ubl-2.0.zip` | XSL UBL 2.0 |
| `xsl.zip` | Paquete XSL adicional |
| `reglas-validacion-cpe-2026-08-26.xlsx` | Reglas CPE al 26/08/2026 |
| `reglas-validacion-gre-2026-06-20.xlsx` | Reglas GRE al 20/06/2026 |
| `reglas-validacion-sspp-2026-07-02.xlsx` | Recibos de servicios públicos |
| `reglas-validacion-boletos-aereos-2026-02-27.xlsx` | DDJJ boletos aéreos |
| `listado-observaciones-migran-a-error.xlsx` | Observaciones que pasan a error |

## Endpoints oficiales citados en los manuales

### SOAP — ambiente de pruebas (beta)

- Factura / boleta / notas: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl`
- Retenciones / percepciones: `https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl`

### SOAP — producción

- Factura electrónica: `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl`
- Retención y percepción: `https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService?wsdl`
- Consulta de validez SOAP: `https://e-factura.sunat.gob.pe/ol-it-wsconsvalidcpe/billValidService?wsdl`
- Consulta de CDR / estado: `https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl`

### REST

- Token: `https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token/`
- Scope GRE: `https://api-cpe.sunat.gob.pe`
- Consulta integrada: `https://api.sunat.gob.pe/v1/contribuyente/contribuyentes/{RUC}/validarcomprobante`

## Pendiente de completar

- Anexos B, C y D de la RS 117-2017 no aparecen como PDF individuales en el índice 2017.
- Guía XML de GRE transportista (código 31) no está publicada como PDF separado equivalente al de remitente.
- Algunos ZIP XSD/XSL del portal Drupal cambian de nombre con cada actualización; conviene re-descargar desde [Guías y Manuales](https://cpe.sunat.gob.pe/guias-y-manuales) si SUNAT publica una versión nueva.
