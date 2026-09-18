# 12 — Benchmark funcional de APIs peruanas

Comparación **funcional y de DX** (sin precios). Fuentes: sitios públicos, manuales y docs de integración consultados en 2026-09. Puede quedar desactualizado; revalidar antes de decisiones comerciales.

## 1. Arquetipos del mercado

| Arquetipo | Qué vende al desarrollador | Ejemplos |
| --- | --- | --- |
| **A. JSON/TXT fácil** | Envías trama; ellos arman UBL, firman, envían | Nubefact |
| **B. OSE / XML gateway** | Envías XML (o CSV); ellos validan como OSE | Efact |
| **C. ERP + API** | Panel completo + REST (a veces con inventario) | Facturalo / Factura Perú |
| **D. BaaS API-first** | API REST moderna, énfasis ISV | Alanube, Apifactura |
| **E. Corporativo / EDI** | Integración a medida, DB/plano, compliance grande | ESTELA (TCI+Digiflow) |
| **F. DIY open source** | Librerías hacia SUNAT directo | Greenter (PHP), sunat-py |

FACTOSYS apunta a superar **A+D** en DX, con profundidad de ciclo (**GRE/SIRE**) que A suele tener parcial, sin forzar al cliente a ser **B**.

## 2. Matriz comparativa

Leyenda: ✅ sí / ⚠️ parcial o beta / ❌ no evidente / ? sin evidencia pública clara

| Capacidad | Nubefact | Efact OSE | Facturalo/FacturaPerú | Alanube | ESTELA/TCI | DIY Greenter |
| --- | --- | --- | --- | --- | --- | --- |
| Modelo hacia el cliente | JSON/TXT | XML/CSV | JSON + panel | JSON API | Plano/DB/EDI | Código propio |
| Factura/Boleta/NC/ND | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GRE | ⚠️ JSON beta/nuevo | ? | ⚠️ según versión | ? | ✅ corporativo | ✅ (SDK GRE) |
| Retención/Percepción | ⚠️ beta | ✅ típico OSE | ⚠️ | ? | ✅ | ⚠️ |
| SIRE | ❌ típico | ? | ❌ típico | ? | ? | ❌ |
| OpenAPI público vivo | ❌ (manual PDF) | ❌ (manual) | ⚠️ Postman | ⚠️ marketing | ❌ | ✅ (gre-api) |
| SDKs oficiales multi-lang | Ejemplos ZIP (PHP/C#/Java/VB6/Fox) | Ej. Java | cURL/JS/PHP/Python | Énfasis API | A medida | PHP Composer |
| Sandbox / demo | ✅ demo route+token | ✅ | ✅ demo | ✅ claim | A medida | Beta SUNAT |
| Webhooks | ? | ? | ⚠️ | ? | ? | N/A |
| Idempotencia documentada | ❌ | ❌ | ❌ | ? | ? | N/A |
| Pre-validación local expuesta | ❌ | OSE valida al recibir | Panel | ✅ claim | OSE | XSD en libs |
| Multi-RUC / ISV | Reseller | ISV/PSE | Marca blanca | ISV | Enterprise | DIY |
| El cliente evita UBL | ✅ | ❌ | ✅ | ✅ | Depende | ❌ |

## 3. Lectura por jugador

### Nubefact (arquetipo A)

- Fortaleza: onboarding simple (`RUTA` + `TOKEN` + JSON/TXT); muchos ejemplos de lenguajes legacy; cobertura CPE básica madura; GRE/retención/percepción en evolución.
- Debilidad DX moderna: sin OpenAPI; un endpoint por empresa; contrato “trama” poco tipado; SDKs no son packages versionados (ZIPs de ejemplo).
- Lección para FACTOSYS: **simplicidad de 3 conceptos** (auth + recurso + payload). Superar con OpenAPI + SDKs npm/composer/pip/nuget.

### Efact (arquetipo B)

- Fortaleza: OSE certificado; OAuth2; ticket → CDR/XML/PDF; ideal si ya generas UBL.
- Debilidad para “revolucionar DX”: el integrador **sigue siendo experto SUNAT**.
- Lección: no competir como “recibe mi XML” en v1; eso no elimina la complejidad.

### Facturalo / Factura Perú (arquetipo C)

- Fortaleza: API + producto de gestión; docs Postman; multi-módulo.
- Debilidad: API acoplada a un facturador monolítico; cobertura “lo que el panel tenga”; no es compliance-layer puro.
- Lección: FACTOSYS se mantiene **capa de cumplimiento**, integrable a cualquier ERP — no clonar un ERP.

### Alanube / Apifactura (arquetipo D)

- Fortaleza: discurso API-first / BaaS alineado a ISVs.
- Debilidad: hay que validar en profundidad GRE, SIRE, OpenAPI real, webhooks e idempotencia (marketing ≠ contrato).
- Lección: el mercado **ya pidió** lo que FACTOSYS plantea; hay que ejecutarlo con más rigor técnico (diccionario UBL, reglas 2026, ciclo completo).

### ESTELA / TCI+Digiflow (arquetipo E)

- Fortaleza: enterprise, OSE, EDI, gran cuenta.
- Debilidad DX self-serve: integración a menudo no es “sign up + OpenAPI”.
- Lección: no pelear enterprise accounts al día 1; ganar **software houses y SaaS**.

### Greenter / sunat-py (arquetipo F)

- Fortaleza: control total, OpenAPI GRE, comunidad.
- Debilidad: cada empresa reimplementa tenancy, PDF, webhooks, correlativos, vault.
- Lección: FACTOSYS puede **inspirarse** en builders UBL open source para el motor interno, pero el producto es la plataforma.

## 4. Huecos que FACTOSYS debe ocupar

1. **OpenAPI + SDKs empaquetados** (npm, Packagist, PyPI, NuGet, Maven) — no ZIP de 2017.
2. **Un solo modelo de estados** para SOAP síncrono, tickets RC/RA y GRE REST.
3. **Idempotencia y webhooks** como default documentado.
4. **Pre-validación** con reglas oficiales versionadas (Excel SUNAT).
5. **GRE de primer nivel** en el mismo auth/tenant que la factura.
6. **SIRE en v2** para cerrar el mes sin otro vendor.
7. **Traceability**: ver XML/CDR/PDF y timeline sin pedir “mándame el ZIP por WhatsApp al soporte”.

## 5. Anti-metas (no copiar)

| Anti-patrón | Por qué |
| --- | --- |
| Un solo POST `/api/v1/{uuid}` sin recursos tipados | Difícil versionar y tipar SDKs |
| Pedir XML al ISV moderno | No reduce carga cognitiva |
| Meter inventario/POS en el core | Diluye el posicionamiento |
| Documentar solo en PDF | Rompe generación de clientes |
| Ejemplos VB6 como estrella | Señal de stack detenido en el tiempo (sí mantener PHP/C#, pero liderar con TS/Python/Go) |

## 6. Criterios de victoria vs mercado

FACTOSYS “revoluciona” si un lead técnico puede:

1. Leer OpenAPI en GitHub/portal.
2. `npm i @factosys/sdk` (o equivalente).
3. Emitir factura en sandbox y recibir webhook `accepted`.
4. Bajar XML + CDR sin hablar con soporte.
5. El mismo día emitir una GRE de prueba con el mismo `company_id`.

Ningún player de la matriz lo cumple hoy de forma completa y pública.
