# SUNAT endpoints (WSDL / REST)

Inventario de URLs oficiales para emisión SEE, consulta CDR, GRE y validez CPE.  
Extraído el **2026-09-17** desde la biblioteca `docs/sunat-oficial/` (README, PDF/XLSX de manuales).  
**Ninguna fila implica prueba live con RUC/SOL** — ver columna `status` y [22-sandbox-setup.md](../22-sandbox-setup.md).

## Status legend

| Status | Significado |
| --- | --- |
| `confirmed` | URL reconstruida/citada en manual oficial (PDF o XLSX) y alineada con README |
| `from_readme` | Solo aparece en README (sin cita explícita en PDF/XLSX revisado) |
| `needs_ruc_test` | URL documentada; falta invocación live con RUC/certificado/SOL |

## Tabla

| environment | service | URL | source_doc | last_verified | status |
| --- | --- | --- | --- | --- | --- |
| beta | billService SendBill (01/03/07/08) | `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl` | `servicios-web-disponibles-ddjj-boletos-aereos.pdf`; `manual-del-programador-see-contribuyente.pdf`; README | 2026-09-17 | needs_ruc_test |
| beta | billService SendBill / SendSummary / getStatus (retención/percepción) | `https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl` | mismos PDF + README | 2026-09-17 | needs_ruc_test |
| beta | billService (servicio beta alternativo) | `https://e-beta.sunat.gob.pe/ol-ti-tcpfegem-beta/billService?wsdl` | `servicios-web-disponibles-ddjj-boletos-aereos.pdf` | 2026-09-17 | needs_ruc_test |
| beta | billService GRE legacy SOAP (09 histórica) | `https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService?wsdl` | `manual-del-programador-see-contribuyente.pdf` | 2026-09-17 | needs_ruc_test |
| beta | billService getStatus | *(mismo WSDL billService beta; método `getStatus` tras `SendSummary`/`SendPack`)* | `manual-del-programador-see-contribuyente.pdf` | 2026-09-17 | needs_ruc_test |
| prod | billService SendBill (01/03/07/08) | `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl` | `servicios-web-disponibles-ddjj-boletos-aereos.pdf`; manual programador; README | 2026-09-17 | confirmed |
| prod | billService (retención/percepción) | `https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService?wsdl` | mismos PDF + README | 2026-09-17 | confirmed |
| prod | billService GRE legacy SOAP | `https://e-guiaremision.sunat.gob.pe/ol-ti-itemision-guia-gem/billService?wsdl` | `manual-del-programador-see-contribuyente.pdf` | 2026-09-17 | confirmed |
| prod | billConsultService (getStatusCdr / CDR) | `https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl` | `servicios-web-disponibles-ddjj-boletos-aereos.pdf`; manual programador; README | 2026-09-17 | confirmed |
| prod | billValidService (validez SOAP legacy) | `https://e-factura.sunat.gob.pe/ol-it-wsconsvalidcpe/billValidService?wsdl` | mismos PDF + README | 2026-09-17 | confirmed |
| prod | billService getStatus | *(mismo WSDL billService prod; método `getStatus`)* | `manual-del-programador-see-contribuyente.pdf` | 2026-09-17 | confirmed |
| prod | GRE token (OAuth2 password / clientessol) | `https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token/` | `manual-servicios-web-gre.pdf`; README | 2026-09-17 | needs_ruc_test |
| prod | GRE scope / base | `https://api-cpe.sunat.gob.pe` | `manual-servicios-web-gre.pdf`; README | 2026-09-17 | confirmed |
| prod | GRE send | `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/{numRucEmisor}-{codCpe}-{numSerie}-{numCpe}` | `manual-url-gre.xlsx` (REST1); link en `_scraped-links.txt` | 2026-09-17 | needs_ruc_test |
| prod | GRE ticket | `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/{numTicket}` | `manual-url-gre.xlsx` (REST2) | 2026-09-17 | needs_ruc_test |
| prod | validez token (extranet) | `https://api-seguridad.sunat.gob.pe/v1/clientesextranet/{client_id}/oauth2/token/` | `manual-consulta-integrada-validez-cpe.pdf`; [28](../28-spec-consulta-validez.md) | 2026-09-17 | needs_ruc_test |
| prod | validez consult | `https://api.sunat.gob.pe/v1/contribuyente/contribuyentes/{RUC}/validarcomprobante` | `manual-consulta-integrada-validez-cpe.pdf`; README | 2026-09-17 | needs_ruc_test |

## Notas

1. **`getStatus` no tiene WSDL propio**: es operación del `billService` (mismo endpoint SendBill/SendSummary). `getStatusCdr` vive en `billConsultService`.
2. **GRE moderna es REST** (`api-cpe`); el SOAP `e-guiaremision` / `guia-gem-beta` es canal legacy. MVP GRE = OAuth + send + ticket (Spike D).
3. **No hay URL GRE “beta” separada** en `manual-servicios-web-gre.pdf` ni en `manual-url-gre.xlsx`. Pruebas GRE usan las mismas URLs prod con credenciales de prueba/SOL — por eso token/send/ticket quedan en `needs_ruc_test`.
4. **Validez MVP** = REST `validarcomprobante` + token `clientesextranet` ([28](../28-spec-consulta-validez.md)). `billValidService` es fallback legacy.
5. **Homologación / SQA** (referencia, no sandbox beta): `https://www.sunat.gob.pe/ol-ti-itcpgem-sqa/billService` — citado en manual del programador.
6. **`_scraped-links.txt`** no lista WSDL crudos; sí apunta a los manuales fuente (`Manual URL – GRE.xlsx`, `Manual_Servicios_GRE`, `manual_programador`, consulta integrada).
7. Env vars sugeridos: ver [22-sandbox-setup.md](../22-sandbox-setup.md) (`SUNAT_SEE_WSDL_URL`, `SUNAT_GRE_*`, `SUNAT_CONSULTA_*`).

## Fuentes consultadas

| Archivo | Rol |
| --- | --- |
| `docs/sunat-oficial/README.md` | Resumen endpoints |
| `docs/sunat-oficial/_scraped-links.txt` | Índices a manuales (sin WSDL inline) |
| `03-manuales-tecnicos/servicios-web-disponibles-ddjj-boletos-aereos.pdf` | WSDL beta/prod + consult |
| `03-manuales-tecnicos/manual-del-programador-see-contribuyente.pdf` | SendBill/SendSummary/getStatus + WSDL |
| `03-manuales-tecnicos/manual-servicios-web-gre.pdf` | OAuth GRE |
| `03-manuales-tecnicos/manual-url-gre.xlsx` | GRE send + ticket paths |
| `03-manuales-tecnicos/manual-consulta-integrada-validez-cpe.pdf` | Token + validarcomprobante |
