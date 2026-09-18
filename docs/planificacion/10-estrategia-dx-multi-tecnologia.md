# 10 — Estrategia: revolucionar la integración para desarrolladores

Objetivo de producto: que integrar facturación electrónica en Perú sea **tan simple y predecible** como integrar Stripe o Twilio — sin que el desarrollador aprenda SOAP, UBL ni catálogos SUNAT.

Sin precios ni personal.

## 1. El problema real (no es “emitir XML”)

Hoy un equipo de desarrollo en Perú enfrenta:

| Fricción | Efecto |
| --- | --- |
| Contratos SUNAT heterogéneos (SOAP CPE + REST GRE + SIRE) | Cada feature nueva es otro protocolo |
| Documentación de proveedores en PDF/Word/Postman suelto | Onboarding lento, sin OpenAPI vivo |
| JSON “plano” estilo Nubefact / Facturalo sin semántica de dominio | Bugs silenciosos (totales, IGV, detracción) |
| OSE que pide **XML ya armado** (Efact) | El integrador sigue cargando con UBL y firma |
| Ejemplos solo en PHP/C# legacy | Node, Python, Go, Flutter quedan huérfanos |
| Sin idempotencia / webhooks claros | Reintentos duplican correlativos |
| GRE y SIRE como add-ons | El ERP nunca cierra el ciclo en una sola API |

**Revolucionar = eliminar esa fricción**, no “ser otro PSE con portal”.

## 2. Tesis DX de FACTOSYS

> Un solo contrato OpenAPI, un modelo canónico tipado, SDKs oficiales en los lenguajes que usa el mercado, sandbox que falla como SUNAT, y artefactos (XML/CDR/PDF) siempre descargables.

El valor no es “cumplimos SUNAT” (piso). El valor es **time-to-first-accepted-invoice &lt; 1 hora** para un developer con RUC de prueba.

## 3. Pilares de revolución

### P1 — Contrato primero (API Design)

- OpenAPI 3 publicado y versionado (`/v1`).
- Recursos tipados (`/invoices`, `/receipts`, …), no un POST genérico opaco.
- Errores máquina + humano + `sunat_code`.
- `Idempotency-Key` obligatorio en emisión.
- Webhooks firmados HMAC como canal primario de estado.

### P2 — Modelo canónico (no UBL al cliente)

- JSON estable documentado en el diccionario ([11-diccionario-json-ubl-factura.md](11-diccionario-json-ubl-factura.md)).
- FACTOSYS compila a UBL 2.1 / 2.0 internamente.
- `totals_mode: auto | strict`.
- Extensiones opcionales en `additional_properties` / `ubl_extensions` solo para casos avanzados.

### P3 — Multi-tecnología de verdad

No bastan “ejemplos ZIP de 2015”. Entregar:

| Capa | Qué |
| --- | --- |
| OpenAPI | Fuente de verdad; genera clientes |
| SDKs oficiales v1 | TypeScript/Node, PHP, Python, C# (.NET), Java |
| SDKs v2 | Go, Ruby, Dart (Flutter) |
| Postman / Insomnia | Colección sync desde OpenAPI |
| CLI | `factosys invoices create --file invoice.json` |
| Terraform / IaC (después) | Provisionar companies/keys en sandbox |

Cada SDK debe incluir:

- Auth
- Emisión factura + boleta + NC
- Poll/webhook helper
- Tipos generados
- Retries con backoff e idempotencia

### P4 — Sandbox de grado producción

| Capacidad | Descripción |
| --- | --- |
| Ambiente beta SUNAT | Compañías sandbox apuntan a WSDL/REST beta |
| Reglas locales | Reproducir rechazos del Excel oficial sin gastar correlativo real |
| Fixtures | Escenarios: gravada, exonerada, exportación, detracción, gratuita |
| Time-travel de tickets | Simular `ticket_pending` → `accepted` |
| Dashboard developer | Logs de request/XML/CDR redactados |

### P5 — Ciclo completo en una API

El desarrollador no ensambla tres proveedores:

```
Emisión CPE → Notas/Bajas/RC → GRE → Consulta validez → (v2) SIRE
```

Un `company_id`, un auth, un modelo de estados.

### P6 — Observabilidad para integradores

- `X-Request-Id` en toda respuesta.
- Endpoint `GET /documents/{id}/trace` (timeline: validated → sent → cdr).
- Webhook + API de reentrega.
- Nunca secretos en logs visibles al cliente.

## 4. Experiencias objetivo (jobs-to-be-done)

| Quién | Job | Éxito |
| --- | --- | --- |
| SaaS POS | Emitir boleta al cobrar | 1 llamada + webhook |
| ERP | Factura + detracción + PDF | Totales correctos sin pelear UBL |
| Ecommerce | Factura B2B / boleta B2C | Series y correlativos atómicos |
| Logistics | GRE antes del despacho | CDR aceptada bloquea el viaje en su app |
| Software house | White-label multi-RUC | N companies bajo 1 organization |

## 5. Qué NO hacemos para “ganar DX”

- No pedimos XML al cliente en v1 (eso es el anti-patrón Efact para ISVs modernos).
- No mezclamos inventario/CRM en el core (Facturalo sí; nosotros somos compliance layer).
- No escondemos el CDR: transparencia total de artefactos.
- No acoplamos el SDK a un solo framework (Nest/Laravel/etc.): HTTP + tipos.

## 6. Métricas de producto (técnicas)

| Métrica | Meta aspiracional |
| --- | --- |
| Tiempo a primera factura aceptada (sandbox) | &lt; 60 min |
| Cobertura OpenAPI ↔ SDKs | 100% de endpoints v1 |
| Tasa de rechazo pre-SUNAT vs post-SUNAT | Pre-validación atrapa ≥ mayoría de errores de reglas |
| Duplicados por reintento | ~0 con idempotencia |
| Lenguajes con SDK oficial v1 | ≥ 5 |

## 7. Relación con el benchmark

Ver [12-benchmark-apis-peru.md](12-benchmark-apis-peru.md): el mercado ya ofrece JSON fácil (Nubefact) o XML/OSE (Efact) o ERP+API (Facturalo). El vacío es **API moderna unificada + SDKs + sandbox + GRE/SIRE en el mismo contrato**.

## 8. Roadmap DX (planificación)

| Fase | Entregable de diseño |
| --- | --- |
| Ahora | Diccionario factura + benchmark + esta estrategia |
| Siguiente | OpenAPI YAML + diccionarios boleta/NC + catálogo errores |
| Luego | Spec de SDKs (interfaces comunes) + plan sandbox fixtures |
| Implementación | Generar SDKs desde OpenAPI; golden XML tests |
