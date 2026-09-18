# 24 — Plan de spikes: firma → Invoice UBL → SendBill beta

Solo planificación. Ejecución = PRs de código **después** de [23-monorepo-bootstrap.md](23-monorepo-bootstrap.md).

Cadena obligatoria (no saltar):

```
A. Firma XMLDSig  →  B. Builder Invoice UBL  →  C. SendBill (beta o mock)  →  D. GRE OAuth + envío
   (ADR-002)            (diccionario 11)           (Manual programador)         (diccionario 18)
```

Si A falla, no tiene sentido perfeccionar B/C en Node. Si B no valida XSD, C solo genera rechazos inútiles. D no arranca en producto hasta C go (o C-mock documentado).

---

## Principios comunes

| Principio | Detalle |
| --- | --- |
| Aislados de Nest | Runners CLI / Vitest; no endpoint HTTP de emisión aún |
| Secretos fuera de git | `.pfx`, SOL, RUC solo env local (ver 22) |
| Evidencia | Cada spike deja `tmp/spikes/<id>/` local + notas en ADR o `docs/planificacion/artifacts/spikes/` (solo logs redactados / golden XML **sin** firma real con cert productivo) |
| Criterio go/no-go | Checklist § al final de cada spike; actualizar ADR-002 y este doc |
| Fixture ancla | `01-invoice-gravada` ([21](21-fixtures-sandbox.md)) |

---

## Spike A — Firma XMLDSig

**Package:** `packages/sunat-sign`  
**ADR:** [002](adr/002-libreria-firma-xmldsig.md)  
**Duración planificada:** 2–4 días enfocados (calendario real depende de cert/validador)

### A.1 Entradas

| Input | Origen |
| --- | --- |
| XML Invoice **sin firmar** | Mínimo hardcodeado o salida prematura de B (skeleton) |
| Certificado `.pfx` de prueba | Emisor; no en repo |
| Password cert | env `SPIKE_CERT_PASSWORD` |
| Política firma SUNAT | Manual programador + ejemplos SFS / guías |

### A.2 Port a congelar (diseño)

```ts
// Diseño — no implementar aún
interface SignXmlPort {
  sign(input: {
    xml: string;           // UBL sin firma
    certificate: Buffer;   // pfx/p12
    password: string;
  }): Promise<{
    signedXml: string;
    digestValue?: string;
    signatureValue?: string;
  }>;
}
```

Una sola implementación activa post-spike (`XmlCryptoSignAdapter` u otra).

### A.3 Casos de prueba del spike

| # | Caso | Éxito |
| --- | --- | --- |
| A1 | Cargar PFX y leer certificado | Subject/RUC visibles en log redactado |
| A2 | Firmar XML mínimo | Nodo `ds:Signature` presente; C14N sin excepción |
| A3 | Re-verificar firma en proceso | Verify = true con misma lib o segunda herramienta |
| A4 | Validador externo | SFS / validador SUNAT / herramienta equivalente acepta firma |
| A5 | (Opcional) ZIP | Nombre `RUC-01-SERIE-N.zip` con un XML |

### A.4 Orden de librerías (igual ADR-002)

1. `xml-crypto` + `@xmldom/xmldom` (+ C14N según docs SUNAT)  
2. Si falla C14N/transforms: `node-forge` / OpenSSL asistido  
3. Escape: CLI Java Santuario — solo si 1–2 agotan

### A.5 Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Transforms/C14N distintos a SUNAT | Comparar XML firmado de SFS vs el nuestro byte a byte en `SignedInfo` |
| Cert no registrado en SOL | Spike A4 local; A5/SendBill requiere registro |
| Dependencia nativa | Preferir pure JS; documentar si hay que usar bindings |

### A.6 Go / No-go

| Resultado | Acción |
| --- | --- |
| A2+A3 verdes; A4 verde o “equivalente confiable” | ADR-002 → **Aceptado**; seguir a B |
| Solo A2, A4 falla | Seguir candidato B/C; no abrir SendBill |
| Nada firma | Replantear stack Node vs sidecar Java **antes** de más UBL |

### A.7 Artefactos a dejar (al ejecutar)

- Commit: adapter + tests verify  
- Nota corta en ADR-002: librería elegida + versión + limitaciones  
- **No** subir PFX ni XML firmados con datos reales a git

---

## Spike B — Builder Invoice UBL 2.1

**Package:** `packages/sunat-ubl`  
**Fuente de campos:** [11-diccionario-json-ubl-factura.md](11-diccionario-json-ubl-factura.md)  
**Schema:** `artifacts/schemas/invoice-create.schema.json`  
**Fixture:** `artifacts/fixtures/01-invoice-gravada.json`

### B.1 Alcance (mínimo viable)

Solo **factura gravada 1 línea** (cat. afectación `10`, IGV 18%, PEN, RUC adquirente).

| Incluir | Excluir (post-spike) |
| --- | --- |
| Cabecera ProfileID / IssueDate / TypeCode / Currency | Exportación, detracción, ISC |
| Supplier desde datos spike (o company stub) | Maestro empresas DB |
| Customer + 1 InvoiceLine + TaxTotal + LegalMonetaryTotal | Multilínea compleja |
| UBLExtensions **vacío o placeholder** para firma | Lógica de firma (la hace A) |
| `cbc:ID` = `{serie}-{correlativo}` | Asignación correlativos productivos |

### B.2 Port

```ts
interface BuildInvoiceXmlPort {
  build(canonical: InvoiceCanonical): { xml: string; fileStem: string };
  // fileStem = `${ruc}-01-${serie}-${number}` sin extensión
}
```

JSON canónico = subset del diccionario 11 / fixture gravada.

### B.3 Validaciones del spike

| # | Chequeo | Herramienta |
| --- | --- | --- |
| B1 | XML well-formed | Parser |
| B2 | XSD UBL Invoice SUNAT (copia en `docs/sunat-oficial`) | libxml o equivalente |
| B3 | Golden file | Diff estructural (ignorar espacios si se acuerda) |
| B4 | Pipeline A←B | `build` → `sign` → verify |

### B.4 Golden XML

- Guardar en repo solo un **golden sin firma** (o con firma dummy marcada TEST), generado a partir del fixture.  
- Path propuesto (al implementar): `packages/sunat-ubl/testdata/golden/01-invoice-gravada.unsigned.xml`  
- Regeneración: script documentado; review humano si cambia XPath críticos.

### B.5 Mapeo de control (subset)

| JSON (fixture) | UBL (recordatorio) |
| --- | --- |
| `operation_type` | `cbc:ProfileID` |
| `serie` + `number` | `cbc:ID` |
| `issue_date` | `cbc:IssueDate` |
| `currency` | `cbc:DocumentCurrencyCode` |
| `customer.*` | `cac:AccountingCustomerParty` |
| `lines[]` | `cac:InvoiceLine` + `cac:TaxTotal` |
| `totals_mode: auto` | Motor calcula `LegalMonetaryTotal` / IGV |

Detalle tag-a-tag: diccionario 11 (no duplicar aquí la tabla completa).

### B.6 Go / No-go

| Resultado | Acción |
| --- | --- |
| B2+B4 verdes | Seguir a C |
| B2 falla | Corregir builder; no SendBill |
| B4 falla | Volver a A (firma) o ubicación de `UBLExtensions` |

---

## Spike C — SendBill beta (o mock controlado)

**Package:** `packages/sunat-soap`  
**Fuente:** Manual del Programador SEE contribuyente  
**Ambiente:** beta SUNAT si hay RUC/SOL/cert; si no → **C-mock** con contrato idéntico

### C.1 Port

```ts
interface BillServicePort {
  sendBill(input: {
    zipBytes: Buffer;
    fileName: string;       // RUC-01-F001-1.zip
    solUser: string;        // RUC+USER
    solPassword: string;
  }): Promise<{
    rawCdrZip: Buffer;
    statusCode?: string;
    statusMessage?: string;
  }>;
}
```

WS-Security UsernameToken; WSDL desde env `SUNAT_SEE_WSDL_URL` (confirmar portal vigente al ejecutar — ver 22 §5).

### C.2 Pipeline E2E del spike

```
fixture 01-invoice-gravada
  → B build unsigned XML
  → A sign
  → zip (1 XML)
  → C sendBill
  → unzip CDR ApplicationResponse
  → clasificar: accepted | accepted_with_observation | rejected
```

### C.3 Casos

| # | Caso | Éxito |
| --- | --- | --- |
| C1 | SOAP handshake / HTTPS | Sin error TLS; fault claro si credenciales mal |
| C2 | SendBill happy path | CDR parseable |
| C3 | Credencial inválida | Error mapeable (no crash) |
| C4 | XML a propósito inválido | CDR rejected + código SUNAT legible |
| C5 | Timeout simulado | Error de red tipado (prepara ADR-001) |

### C.4 Rama sin beta (C-mock)

Si aún no hay RUC de prueba:

1. Implementar `FakeBillService` que devuelve CDR ZIP de muestra (aceptada / rechazada).  
2. Misma interfaz `BillServicePort`.  
3. Documentar bloqueo: “C real pendiente de credenciales”.  
4. **No** marcar spike C como cerrado en producción; sí cerrar “contrato cliente SOAP”.

### C.5 Mapeo errores (mínimo)

| Origen | Código FACTOSYS (plan 16) |
| --- | --- |
| SOAP fault / HTTP | `SUNAT_TRANSPORT` |
| CDR rejected | `SUNAT_<codigo>` desde ApplicationResponse |
| Timeout post-envío | `SUNAT_TIMEOUT` + correlativo retenido (ADR-001) |

### C.6 Go / No-go

| Resultado | Acción |
| --- | --- |
| C2 verde en beta | Desbloquear API `POST /invoices` real |
| Solo C-mock verde | Seguir API con `mock-cdr`; beta en paralelo (22) |
| C2 rejected sistemático | Analizar código CDR; volver a B/A antes de más features |

---

## Spike D — GRE OAuth + envío mínimo

**Después de C** (firma A + builder UBL reutilizable; CPE SOAP no es prereq técnico de REST GRE, pero el gate de producto pide C estable antes de abrir otro canal SUNAT).  
**Package:** `packages/sunat-gre` (cliente REST) + reuso `sunat-sign` / builder DespatchAdvice  
**Fuente:** [18-diccionario-json-ubl-gre.md](18-diccionario-json-ubl-gre.md) §7–§11 · Manual servicios GRE · Excel GRE  
**Fixtures:** `09-gre-remitente-min` · `31-gre-transportista-min`  
**Schema:** `artifacts/schemas/despatch-advice-create.schema.json`

Cadena:

```
C go (o C-mock documentado)  →  D. OAuth GRE + envío mínimo DespatchAdvice
```

### D.1 Entradas

| Input | Origen |
| --- | --- |
| `client_id` / `client_secret` GRE | Portal / `credentials/gre` (env 22) |
| SOL user + password | Mismos secretos empresa |
| XML DespatchAdvice firmado | Builder GRE (subset diccionario 18) + Spike A |
| Fixture | Preferir `09-gre-remitente-min`; 31 cuando haya RUC transportista |

### D.2 Ports a congelar (diseño)

```ts
// Diseño — no implementar aún
interface GreOAuthPort {
  getAccessToken(input: {
    clientId: string;
    clientSecret: string;
    solUser: string;
    solPassword: string;
    scope?: string; // default https://api-cpe.sunat.gob.pe
  }): Promise<{ accessToken: string; expiresInSec: number }>;
}

interface GreDespatchPort {
  sendDespatch(input: {
    accessToken: string;
    zipBytes: Buffer;
    fileName: string; // RUC-09-T001-1.zip
  }): Promise<{
    ticket?: string;
    httpStatus: number;
    rawBody: unknown;
  }>;

  getStatus(input: {
    accessToken: string;
    ticket: string;
  }): Promise<{
    status: "ticket_pending" | "accepted" | "accepted_with_observation" | "rejected";
    cdrZip?: Buffer;
    sunatCode?: string;
  }>;
}
```

Token URL (confirmar portal al ejecutar):  
`https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token/`  
Base CPE: `SUNAT_GRE_BASE_URL` (default `https://api-cpe.sunat.gob.pe`).

### D.3 Casos de prueba del spike

| # | Caso | Éxito |
| --- | --- | --- |
| D1 | Password grant + scope `api-cpe` | `access_token` + TTL ~3600 |
| D2 | Cache token / re-fetch tras TTL o 401 | Sin spam de tokens; 401 → refresh |
| D3 | Envío ZIP GRE 09 mínima | Ticket o CDR parseable |
| D4 | Credencial / client inválido | Error tipado (no crash) |
| D5 | (Opcional) Fixture 31 con `shipper` + placa + `license` | Prevalidación local pass; envío si hay emisor 31 |
| D6 | Rama sin beta | `FakeGreDespatch` misma interfaz + nota “D real pendiente” |

### D.4 Go / No-go

| Resultado | Acción |
| --- | --- |
| D1+D3 verdes (beta) | Desbloquear `POST /despatch-advices` real; seguir 31 endurecido |
| Solo D6 (fake) verde | API con mock GRE; beta OAuth en paralelo (22) |
| D1 falla | Revisar grant/scope/credenciales portal; no builder masivo |
| D3 rejected sistemático | Volver a mapa tag §7 / XSD GRE antes de más motivos |

### D.5 Artefactos a dejar (al ejecutar)

- Adapter OAuth + send/status + tests  
- Nota URLs/fecha consulta portal (como C)  
- **No** subir tokens, client_secret ni ZIP firmados productivos

---

## Matriz de dependencias y paralelismo

| Trabajo | Paralelo con | Bloqueado por |
| --- | --- | --- |
| PR0 monorepo | — | — |
| Spike A | Lectura Manual firma | PR0 |
| Spike B (unsigned) | A (parcial) | PR0; diccionario 11 |
| B+A integración | — | A go + B go parcial |
| Spike C | Preparar WSDL/env | A+B go; secretos o mock |
| Pre-validación Excel | A/B | No bloquea SendBill mínimo |
| Spike D (GRE OAuth) | Lectura manual GRE / diccionario 18 | **C go** (o C-mock); A go; builder DespatchAdvice mínimo |
| RA / RC SendSummary | — | C estable para CPE |

---

## Definición de “spikes cerrados” (gate a producto)

Antes de implementar emisión HTTP persistente:

- [ ] ADR-002 en estado **Aceptado** (o excepción Java documentada)
- [ ] Golden Invoice unsigned en repo + test XSD
- [ ] `BillServicePort` + al menos un adapter (beta o fake) con test
- [ ] Pipeline script documentado: fixture → CDR (real o mock)
- [ ] Notas de URLs WSDL usadas (fecha de consulta portal)
- [ ] Ningún secreto en git (`git secrets` / revisión manual)

Antes de GRE en API persistente (además de lo anterior):

- [ ] Spike D: `GreOAuthPort` + `GreDespatchPort` (beta o fake) con test
- [ ] Fixture 09 (y 31 local-rules) alineados a schema + diccionario 18

---

## Qué sigue después (fuera de este doc)

1. Persistencia documents + correlativos (ADR-001)  
2. `POST /v1/invoices` según OpenAPI  
3. Motor reglas Excel + runner `local-rules`  
4. Boleta/NC/ND reutilizando UBL kernel  
5. RA/RC `SendSummary`  
6. GRE REST tras Spike D (`POST /despatch-advices`)  

Ver [09-siguientes-pasos.md](09-siguientes-pasos.md).
