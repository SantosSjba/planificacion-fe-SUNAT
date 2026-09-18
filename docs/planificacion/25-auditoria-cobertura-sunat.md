# 25 — Auditoría: `sunat-oficial` ↔ planificación

Fecha: **2026-09-17**  
Método: cuatro revisiones en paralelo (CPE/SOAP, GRE, post-MVP, completitud MVP interna).  
Modo: solo planificación (sin código).

**Veredicto (cierre documental 2026-09-17):** documentación MVP **completa** para backlog/sprints. Incluye remediación P0/P1 + pendientes “opcionales” (@listURI, catálogos masivos, gate XSL nightly, endpoints WSDL/REST).

Único ítem no documental: prueba live `needs_ruc_test` en [artifacts/sunat-endpoints.md](artifacts/sunat-endpoints.md).

Confianza: **~94 / 100**.

### Remediación aplicada (incluye oleada final)

| Hueco | Doc / artifact |
| --- | --- |
| Catálogos sin export | `artifacts/catalogs/` (~46 JSON) + ADR-005 |
| XSD/XSL sin gate | [29](29-plan-gate-xsd-xsl.md) + [31](31-ci-quality-gates.md) nightly XSL |
| GRE tag-a-tag / 31 / OAuth | [18](18-diccionario-json-ubl-gre.md) + Spike D |
| RS-075/108 + DAE | [30](30-normativa-2026-y-dae.md) |
| Guía datos tributarios | 04 / 11 |
| Modelo Postgres | [26](26-modelo-datos-postgres.md) |
| Webhooks | [ADR-004](adr/004-webhooks.md) |
| PDF/RI | [27](27-spec-pdf-ri.md) |
| Validez | [28](28-spec-consulta-validez.md) |
| @listURI Invoice | `artifacts/ubl-attributes/invoice-listuri-schemes.json` |
| Matriz IGV 07×05 | `artifacts/catalogs/matrix-07-x-05-igv.json` |
| WSDL/REST URLs | `artifacts/sunat-endpoints.md` + [22](22-sandbox-setup.md) |
| Ruido “pendiente” | 04, 05, 11, 13, 21 |

---

## 1. Cobertura por bloque oficial (histórico auditoría)

| Bloque `sunat-oficial` | En planificación | Estado |
| --- | --- | --- |
| SEE contribuyente / Manual programador / SendBill | 00, 01, 05, 24 | **CUBIERTO** (spike C) |
| Guías XML 01/03/07/08 | 11–15, OpenAPI, fixtures | **PARCIAL** (esqueleto fuerte; `@listURI` / matrices pendientes) |
| RA / RC guías + SendSummary | 19, 20, schemas, fixtures | **CUBIERTO** (sin spike aún) |
| Excel reglas CPE + códigos retorno | 16 + JSON 2077 | **PARCIAL** (códigos sí; hojas de reglas no ejecutables) |
| XSD / XSL zips | citados; spike B asume XSD | **PARCIAL** (no harness CI planificado) |
| Catálogos Anexo VII / RS-340 ZIP | refs en 04/11; package stub | **FALTA** artifact machine-readable |
| WSDL / servicios web PDF | README + env 22 | **PARCIAL** (URLs por confirmar; sin `.wsdl` en repo) |
| GRE RS 123 + manual REST + URL + Excel | 18, OpenAPI, fixtures 09/31 | **PARCIAL** (09 OK dominio; 31 y tag-a-tag flojos) |
| Consulta validez | OpenAPI stub, 03 MVP | **PARCIAL** |
| SIRE / retención / percepción | 03 → v2 | **FUERA MVP** (correcto) |
| OSE / PSE / SFS | 03/04 fuera o referencia | **FUERA MVP** (correcto) |
| SSPP / boletos / contingencia | 03 → v3 | **FUERA MVP** (docs existen; mapa fino débil) |
| Confirmación CPE | 03 v2/v3 | **FUERA MVP** (solo 1 docx local vs varios en portal) |
| DAE | nombrado en 03 | **HUÉRFANO** (cero archivos en biblioteca) |
| RS-075-2026 / RS-108-2026 | en disco | **SIN MAPEAR** |

---

## 2. Hallazgos críticos (priorizados)

### A. Frente a `sunat-oficial` (normativa → plan)

1. **Catálogos SUNAT no exportados** a `artifacts/` (Anexo VII / RS-340) — bloquea pre-validación seria.
2. **XSD/XSL** presentes pero sin plan de gate CI; motor pensado “Excel-first”.
3. **GRE:** sin mapa tag-a-tag; Excel GRE tiene ~97/73 TAG; 31 incompleto vs Excel (falta `shipper` en fixture 31); sin spike OAuth GRE.
4. **RS 2026 (075/108)** y **guía datos tributarios recomendados** sin absorción en plan.
5. **DAE** citado en matriz sin PDF en `sunat-oficial`.
6. **Percepción:** local v1.0 vs portal scrapea v1.2 (riesgo v2).

### B. Frente al MVP declarado (03 §3)

| Capacidad MVP | Estado plan |
| --- | --- |
| Empresa + cert + SOL | CUBIERTO |
| Factura + XML/CDR | CUBIERTO |
| Boleta + RC | CUBIERTO |
| NC / ND | CUBIERTO |
| RA | CUBIERTO |
| GRE 09 / 31 básico | CUBIERTO* (31 parcial a propósito) |
| Validez CPE | PARCIAL |
| Webhooks | PARCIAL (falta ADR) |
| PDF / RI | PARCIAL (falta spec) |

### C. Inconsistencias internas (higiene)

| Doc | Problema |
| --- | --- |
| `04` §6 | Sigue “diccionarios/OpenAPI/errores pendientes” — ya existen |
| `05` §10 | ADR correlativos/firma como pendientes — 001/002 existen |
| `11` §14 | “diccionarios hermanos” — ya existen |
| `13` / `21` | refs “RC futuro” / “22 futuro” — obsoletas |
| `08` vs OpenAPI | algunos paths solo en 08; ejemplo tax antiguo |
| `18` | `carrier` top-level vs `shipment.carrier` |
| OpenAPI ↔ schemas | requireds Invoice/GRE no 1:1 |

---

## 3. Lo que NO se escapó

- Posicionamiento SEE contribuyente (no OSE v1).
- Contrato SOAP SendBill + asíncrono RA/RC a nivel producto.
- GRE por REST (no SOAP) + timing CDR.
- Diccionarios para todos los tipos MVP de emisión.
- Catálogo de códigos de retorno CPE exportado.
- OpenAPI + fixtures + plan monorepo/spikes.
- Post-MVP (SIRE, OSE, SSPP) mayormente bien etiquetado.

---

## 4. Recomendación (seguir solo planificación)

Orden sugerido **antes** de desarrollo:

| Prio | Acción |
| --- | --- |
| P0 | Hygiene: actualizar 04§6, 05§10, 11§14, 13, 21, OpenAPI `info` |
| P0 | `26` modelo datos Postgres |
| P0 | ADR-004 webhooks |
| P1 | ADR-005 versionado catálogos + export catálogos clave a artifacts |
| P1 | Spec PDF/RI MVP |
| P1 | Endurecer GRE: mapa tag desde Excel + corregir fixture 31 + carrier path |
| P2 | Spec validez + fixture; schemas NC/ND/boleta |
| P2 | Clasificar RS-075/108-2026; quitar o documentar DAE |
| P2 | Spike SendSummary en plan 24 (ampliar); nota OAuth GRE |

**Para abrir monorepo/spikes A–C:** la auditoría **no bloquea**; los huecos P0 de producto (datos/webhooks/PDF) bloquean la API completa, no la firma ni SendBill.

---

## 5. Subagentes (trazabilidad)

| Foco | Resultado |
| --- | --- |
| CPE/SOAP vs oficial | [Audit CPE SOAP](94608b37-aa7d-4f6c-94e7-b94a0335f3bd) |
| GRE vs oficial | [Audit GRE](b14a6c10-b9bf-4506-8c7a-020ea96212a7) |
| SIRE/OSE/extras | [Audit post-MVP](5cba575c-1a74-4a97-b937-89c6ba01d376) |
| Completitud MVP interna | [Audit MVP plan](ca1e1174-108d-4b3e-b39a-96fbd065ab80) |
