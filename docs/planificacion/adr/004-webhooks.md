# ADR-004 — Webhooks de estado (firma, reintentos, payload)

Estado: **Aceptado** (planificación)  
Fecha: 2026-09-17  
Relacionado: `07-seguridad-y-cumplimiento.md` §6, `08-api-publica-borrador.md` §4, `artifacts/openapi-v1.yaml` (Webhooks), `26-modelo-datos-postgres.md`, ADR-001

## Contexto

El MVP es API-first y asíncrono (`queued` → `sent` / `ticket_pending` → terminal). El canal primario de notificación al integrador es HTTPS outbound con firma HMAC, no long-polling obligatorio.

OpenAPI v1 solo declara el evento `document.status_changed`. Hay que congelar: formato de firma, headers, schedule de reintentos, desactivación por fallos, idempotencia de entrega y forma del body **sin secretos**.

## Decisión

### 1. Eventos (MVP)

| `event` | Cuándo se encola |
| --- | --- |
| `document.status_changed` | Cada transición persistida en `document_events` hacia un status “notificable” |

Status notificables MVP:  
`validated`, `queued`, `sent`, `ticket_pending`, `accepted`, `accepted_with_observation`, `rejected`, `failed`, `cancelled`.

No notificar el ingest puro `draft` salvo que el producto lo exponga después (evitar ruido).

Suscripción: campo `events` en `POST /webhook-endpoints`; default `["document.status_changed"]` (OpenAPI).

### 2. Transporte

- Método: `POST`
- URL: solo `https://` (rechazar `http://` en create).
- Timeout cliente FACTOSYS: **5s** connect + **10s** total (configurables).
- Éxito: HTTP **2xx**. Cualquier otro código o error de red = fallo de intento.
- Redirects: **no seguir** (evitar SSRF / open redirect).
- SSRF: bloquear IPs privadas/link-local/metadata cloud en resolución DNS (allowlist opcional por organization).

### 3. Secreto y rotación

- Al crear endpoint, generar secreto criptográfico (≥ 32 bytes, encoding `base64url` o `whsec_…`).
- Mostrar secreto **una sola vez** en `201`; listados solo `secret_hint` (últimos 4).
- `POST /webhook-endpoints/{id}/rotate-secret` invalida el anterior tras gracia opcional de **24h** con doble firma (ver abajo) o corte inmediato en MVP (documentar breaking).
- Persistencia: material firmable en vault / columna cifrada; API nunca re-lee el secreto en claro vía GET.

### 4. Firma HMAC

Algoritmo: **HMAC-SHA256**.

#### Headers obligatorios en cada delivery

| Header | Valor |
| --- | --- |
| `Content-Type` | `application/json; charset=utf-8` |
| `User-Agent` | `Factosys-Webhooks/1.0` |
| `X-Factosys-Event` | `document.status_changed` |
| `X-Factosys-Delivery-Id` | UUID de `webhook_deliveries.id` |
| `X-Factosys-Timestamp` | Unix seconds (UTC) |
| `X-Factosys-Signature` | ver formato |

Opcional MVP+ (recomendado al implementar):

| Header | Valor |
| --- | --- |
| `X-Factosys-Signature-Version` | `v1` |

#### Formato de `X-Factosys-Signature`

String a firmar (UTF-8):

```text
{timestamp}.{raw_body}
```

donde `raw_body` es exactamente el JSON bytes enviados (sin reserializar en el verificador del cliente).

Firma:

```text
hex = HMAC_SHA256(secret, "{timestamp}.{raw_body}")  → hex lowercase
header = "v1=" + hex
```

Ejemplo:

```http
X-Factosys-Timestamp: 1726627200
X-Factosys-Signature: v1=6a3f0c…
```

Durante ventana de rotación (si se habilita): múltiples firmas separadas por coma:

```http
X-Factosys-Signature: v1=…,v1=…
```

El receptor debe aceptar si **alguna** firma válida coincide (timing-safe compare).

#### Anti-replay

El receptor **debe** rechazar si `|now - timestamp| > 300` segundos (5 min). FACTOSYS documenta este contrato en SDKs (`verifyWebhookSignature`).

### 5. Payload (`document.status_changed`)

```json
{
  "id": "8f2c1a6e-…",
  "event": "document.status_changed",
  "api_version": "v1",
  "occurred_at": "2026-09-17T20:00:00.000Z",
  "organization_id": "…",
  "data": {
    "document_id": "…",
    "company_id": "…",
    "type": "01",
    "serie_number": "F001-00000123",
    "status": "accepted",
    "previous_status": "sent",
    "environment": "sandbox",
    "sunat_code": "0",
    "sunat_message": null,
    "ruleset_version": "2026-08-26",
    "links": {
      "self": "/v1/documents/{document_id}",
      "xml": "/v1/documents/{document_id}/xml",
      "cdr": "/v1/documents/{document_id}/cdr",
      "pdf": "/v1/documents/{document_id}/pdf"
    }
  }
}
```

Notas:

- `id` = `delivery_id` (mismo que header).
- `links` son paths relativos a la API pública; el cliente usa su base URL + API key. **No** URLs pre-firmadas S3 de larga vida en el body.
- Campos `sunat_*` solo cuando existan; no inventar.
- Alineado al ejemplo de `08-api-publica-borrador.md`, extendido con ids de tenancy y `previous_status` para DX.

### 6. Seguridad del body (obligatorio)

**Prohibido** en payload, headers o query:

- API keys, secretos webhook, SOL password, GRE client_secret, PFX, XML completo, CDR completo, PDF binario.
- Datos de adquirente más allá de lo ya listable por API (MVP: no incluir nombre/documento en webhook; el cliente hace GET si lo necesita). Si en el futuro se añade, será opt-in y mínimo.

### 7. Idempotencia de delivery

Clave estable por endpoint:

```text
{endpoint_id}:{document_id}:{to_status}:{document_events.id}
```

- Un evento de timeline → como máximo una fila `webhook_deliveries` “lógica” por endpoint.
- Reintentos **reutilizan** el mismo `delivery_id` y el mismo body (mismo `occurred_at` / mismo JSON).
- El receptor debe tratar `X-Factosys-Delivery-Id` como idempotent key propio (ack duplicado = 2xx sin re-procesar).

No reenviar el mismo status si no hubo nuevo `document_events` row (evitar spam en retries internos del documento).

### 8. Schedule de reintentos

Cola BullMQ `webhooks`. Backoff fijo documentado:

| Intento | Delay desde fallo anterior |
| --- | --- |
| 1 | inmediato (primer POST) |
| 2 | 30 s |
| 3 | 2 min |
| 4 | 10 min |
| 5 | 30 min |
| 6 | 2 h |
| 7 | 6 h |
| 8 | 24 h |

- Máximo **8** intentos por delivery.
- Tras agotar intentos: `webhook_deliveries.status = failed`; incrementar `webhook_endpoints.consecutive_failures`.
- Éxito 2xx: `consecutive_failures = 0`, `last_success_at = now()`.

### 9. Disable automático

- Si `consecutive_failures >= 20` **o** 5 deliveries distintas consecutivas agotadas sin ningún éxito intermedio → `status = disabled`, `disabled_at = now()`.
- Evento de auditoría `webhook.auto_disabled`.
- Reactivación: `PATCH`/acción admin o re-create; al reactivar, reset del contador.
- Endpoints `disabled` no encolan nuevos jobs (las transiciones de documento no se pierden del timeline; reentrega manual es post-MVP salvo spike DX).

### 10. Orden y concurrencia

- Entregas por documento: FIFO aproximado por `document_events.at` (un job a la vez por `document_id`+`endpoint_id` vía group key BullMQ si está disponible).
- No hay garantía global cross-document; el cliente debe tolerar fuera de orden raro y confiar en `previous_status` + GET.

### 11. Observabilidad

- Cada intento loguea: delivery_id, endpoint_id, http_status, latency, attempt — sin body de respuesta completo si puede contener PII.
- Stage de error FACTOSYS `webhook` reservado a fallos **inbound** de configuración; fallos outbound no rompen el ciclo del CPE.

## Consecuencias

- SDKs implementan `verifyWebhookSignature(rawBody, headers, secret)` según este ADR.
- Modelo datos: tablas `webhook_endpoints` / `webhook_deliveries` en doc 26.
- OpenAPI permanece con evento único MVP; nuevos eventos = minor version + este ADR enmendado.
- Integradores pueden usar solo webhooks + GET ocasional; polling no es obligatorio.

## Alternativas descartadas

- JWT firmado en body → más pesado; HMAC + timestamp basta.
- Incluir XML/CDR en webhook → riesgo tamaño/PII/secretos; usar links API.
- Reintentos infinitos → endpoints zombie y costo.
- Firmas solo en query string → filtrado en logs de proxies.
