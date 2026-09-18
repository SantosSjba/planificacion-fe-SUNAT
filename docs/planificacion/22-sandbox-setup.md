# 22 — Setup sandbox (borrador)

Cómo levantar un ambiente de prueba cuando existan RUC/certificado beta.  
**No** contiene secretos reales.

## 1. Modos

| Mode | Requiere | Uso |
| --- | --- | --- |
| `local-rules` | Solo repo + reglas Excel | CI, onboarding sin SOL |
| `mock-cdr` | API local | Demos / SDKs |
| `sunat-beta` | RUC prueba + .pfx + SOL (+ GRE client_id) | Validación real |

## 2. Variables de entorno (plantilla)

```bash
FACTOSYS_ENV=sandbox
DATABASE_URL=postgres://…
REDIS_URL=redis://…
STORAGE_ENDPOINT=http://localhost:9000
# Por empresa (nunca en git):
SUNAT_SOL_USER=
SUNAT_SOL_PASSWORD=
SUNAT_CERT_PATH=           # o secret ref
SUNAT_CERT_PASSWORD=
SUNAT_GRE_CLIENT_ID=
SUNAT_GRE_CLIENT_SECRET=
SUNAT_SEE_WSDL_URL=https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl
SUNAT_GRE_BASE_URL=https://api-cpe.sunat.gob.pe
SUNAT_CONSULTA_CLIENT_ID=
SUNAT_CONSULTA_CLIENT_SECRET=
SUNAT_CONSULTA_TOKEN_URL=https://api-seguridad.sunat.gob.pe/v1/clientesextranet/{client_id}/oauth2/token/
SUNAT_CONSULTA_BASE_URL=https://api.sunat.gob.pe
```

Inventario completo (beta/prod, GRE, validez, status):  
**[artifacts/sunat-endpoints.md](artifacts/sunat-endpoints.md)** — verificado en docs oficiales el 2026-09-17.

## 3. Checklist onboarding sandbox

1. Crear `company` con RUC de prueba.
2. Subir certificado (`POST /companies/{id}/certificate`).
3. Guardar SOL (`…/credentials/sol`).
4. Si GRE: guardar OAuth (`…/credentials/gre`).
5. Crear series F/B/T (+ V si 31).
6. Correr fixture `01-invoice-gravada` en `local-rules`, luego `sunat-beta`.
7. Verificar webhook de prueba (HMAC).

## 4. Datos

- Placeholders en fixtures: `{{company_id}}`, `{{related_invoice_serie_number}}`, etc.
- Runner sustituye desde estado del sandbox (última factura accepted → GRE/RA).

## 5. Pendiente

- [ ] RUC(s) de prueba asignados
- [x] URLs WSDL/REST documentadas → [artifacts/sunat-endpoints.md](artifacts/sunat-endpoints.md)
- [ ] Script `pnpm fixtures:run --mode=local-rules` (post-monorepo)
- [ ] Ejecutar spike C real vs C-mock — ver [24](24-plan-spikes-emision.md) §C

### 5.1 Checklist WSDL / REST (live RUC)

URLs conocidas; **falta prueba live** salvo que se marque.

| Service | Env URL (default sandbox) | Doc | Live RUC |
| --- | --- | --- | --- |
| billService SendBill (01/03/07/08) | `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl` | PDF servicios-web + programador | [ ] needs_ruc_test |
| billService getStatus | *(mismo WSDL beta; método `getStatus`)* | manual programador | [ ] needs_ruc_test |
| billService retención/percepción | `https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl` | PDF servicios-web | [ ] needs_ruc_test |
| billService beta alternativo | `https://e-beta.sunat.gob.pe/ol-ti-tcpfegem-beta/billService?wsdl` | PDF servicios-web | [ ] needs_ruc_test (opcional) |
| billConsultService | `https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl` (prod) | PDF servicios-web | [ ] needs_ruc_test |
| GRE token | `https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token/` | manual GRE | [ ] needs_ruc_test |
| GRE send | `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/{…}` | `manual-url-gre.xlsx` | [ ] needs_ruc_test |
| GRE ticket | `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/{numTicket}` | `manual-url-gre.xlsx` | [ ] needs_ruc_test |
| validez token | `https://api-seguridad.sunat.gob.pe/v1/clientesextranet/{client_id}/oauth2/token/` | manual consulta integrada | [ ] needs_ruc_test |
| validez consult | `https://api.sunat.gob.pe/v1/contribuyente/contribuyentes/{RUC}/validarcomprobante` | mismo manual | [ ] needs_ruc_test |

Nota GRE: no hay host beta separado en los manuales; se usan URLs prod + credenciales de prueba.

## 6. Relación con spikes

Sin credenciales beta, el spike C usa `FakeBillService` (misma interfaz). El setup de este documento se vuelve obligatorio solo para **C2 happy path real**.
