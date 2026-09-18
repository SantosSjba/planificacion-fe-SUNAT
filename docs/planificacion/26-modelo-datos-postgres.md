# 26 — Modelo de datos PostgreSQL (MVP SEE contribuyente)

Estado: **borrador de planificación** (sin código de producto)  
Fecha: 2026-09-17  
Alcance: API NestJS + Postgres + Redis/BullMQ + object storage S3-compatible  
Relacionado: `05-arquitectura.md`, `06-stack-tecnologico.md`, `07-seguridad-y-cumplimiento.md`, `08-api-publica-borrador.md`, `artifacts/openapi-v1.yaml`, ADR-001, ADR-004, ADR-005

## 1. Principios

1. **Tenancy obligatorio:** toda fila de negocio lleva `organization_id`; casi todas las de emisión llevan también `company_id`. Ningún query de documentos/artefactos/series/webhooks omite ambos filtros en la capa de aplicación.
2. **Secretos fuera de columnas plaintext:** certificados, SOL y GRE viven como **referencias** cifradas / vault keys; Postgres guarda metadata + `secret_ref`.
3. **Artefactos binarios en S3:** XML, ZIP, CDR, PDF, PFX cifrado; Postgres guarda path, hash, tamaño, content-type.
4. **Timeline append-only:** `document_events` y `audit_events` no se actualizan (salvo campos de entrega de webhooks).
5. **Correlativos atómicos:** reserva bajo `SELECT … FOR UPDATE` (o advisory lock) en `document_series`, alineado a ADR-001.
6. **UUIDv7 (preferido) o UUIDv4** como PK públicas; no exponer seriales internos.

Convenciones SQL:

- Timestamps: `timestamptz`, UTC.
- Dinero / cantidades en JSON canónico; columnas numéricas solo para correlativos e índices.
- Soft-delete solo donde la API lo necesite (`api_keys.revoked_at`, `webhook_endpoints.status`).
- Enums Postgres o `text` + `CHECK`; en migraciones iniciales preferir `text` + check para evolucionar sin `ALTER TYPE` doloroso.

---

## 2. Diagrama lógico (tenancy)

```
organizations 1──* api_keys
       │
       └──* companies 1──* credentials
                 │      1──* document_series
                 │      1──* documents 1──* document_artifacts
                 │                 │     1──* document_events
                 │                 └── (idempotency_keys por org+company+key)
                 └──* webhook_endpoints 1──* webhook_deliveries

catalog_versions 1──* catalog_items   (globales FACTOSYS; pin en companies)
audit_events      (organization_id nullable solo para eventos de plataforma)
```

---

## 3. Enums de dominio

### 3.1 `document_status` (alineado a `03` + OpenAPI)

| Valor | Significado |
| --- | --- |
| `draft` | Recibido; aún no firmado/enviado |
| `validated` | Pre-validación local OK |
| `queued` | En cola BullMQ `sunat-send` |
| `sent` | Wire a SUNAT realizado; esperando CDR sincrónico o ticket |
| `ticket_pending` | Ticket asíncrono (`SendSummary` / GRE) |
| `accepted` | CDR / respuesta aceptada |
| `accepted_with_observation` | Aceptada con observación |
| `rejected` | Rechazo de negocio (prevalidación o CDR) |
| `failed` | Error técnico reintentable |
| `cancelled` | Baja aceptada / anulación de ciclo cuando aplique |

Transiciones válidas (motor de dominio; no FK):

- `draft → validated | rejected`
- `validated → queued | rejected`
- `queued → sent | failed | rejected`
- `sent → accepted | accepted_with_observation | rejected | ticket_pending | failed`
- `ticket_pending → accepted | accepted_with_observation | rejected | failed`
- `failed → queued` (retry interno, mismo `document_id` / correlativo retenido si ADR-001 aplica)
- `accepted | accepted_with_observation → cancelled` (cuando RA aceptada cierra el ciclo)

### 3.2 Otros enums

| Campo | Valores MVP |
| --- | --- |
| `companies.environment` | `sandbox`, `production` |
| `credentials.kind` | `certificate`, `sol`, `gre` |
| `credentials.status` | `active`, `expired`, `revoked`, `missing` |
| `document_artifacts.kind` | `request_json`, `xml_unsigned`, `xml_signed`, `zip`, `cdr_xml`, `pdf`, `other` |
| `webhook_endpoints.status` | `active`, `disabled` |
| `webhook_deliveries.status` | `pending`, `success`, `failed` |
| `api_keys.status` | `active`, `revoked` |
| `catalog_versions.kind` | `ruleset_excel`, `anexo_vii`, `rs340`, `codigos_retorno`, `ubigeo`, `other` |
| `idempotency_keys.status` | `in_progress`, `completed`, `expired` |

---

## 4. Tablas

### 4.1 `organizations`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `slug` | text UNIQUE | opcional DX |
| `status` | text NOT NULL DEFAULT `active` | `active` \| `suspended` |
| `rate_limit_rpm` | int NULL | override; default en config |
| `ip_allowlist` | jsonb NULL | array CIDR; null = sin restricción |
| `created_at` / `updated_at` | timestamptz | |

Índices: `UNIQUE (slug)` donde no null.

---

### 4.2 `api_keys`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK → organizations | ON DELETE CASCADE |
| `name` | text NOT NULL | etiqueta humana |
| `key_prefix` | text NOT NULL | primeros 8 chars públicos |
| `key_hash` | text NOT NULL | Argon2id / bcrypt del secreto completo |
| `scopes` | text[] NOT NULL | `documents:write`, `documents:read`, `credentials:manage`, `webhooks:manage` |
| `status` | text NOT NULL | `active` \| `revoked` |
| `environment_constraint` | text NULL | `sandbox` \| `production` \| null = ambos |
| `last_used_at` | timestamptz NULL | |
| `revoked_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

Índices:

- `UNIQUE (key_prefix)` o lookup por prefix + verify hash.
- `(organization_id, status)`.

**Nunca** persistir la API key en claro tras el create response.

---

### 4.3 `companies`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK → organizations | |
| `ruc` | char(11) NOT NULL | |
| `legal_name` | text NOT NULL | |
| `trade_name` | text NULL | |
| `environment` | text NOT NULL DEFAULT `sandbox` | `sandbox` \| `production` |
| `address` | jsonb NULL | domicilio fiscal opcional |
| `catalog_pin` | jsonb NOT NULL DEFAULT `{}` | ver ADR-005: `{ "ruleset": "2026-08-26", "anexo_vii": "…", "rs340": "…" }` |
| `timezone` | text NOT NULL DEFAULT `America/Lima` | |
| `created_at` / `updated_at` | timestamptz | |

Constraints / índices:

- `UNIQUE (organization_id, ruc, environment)` — mismo RUC puede existir en sandbox y production como filas distintas.
- `(organization_id, id)` para joins de tenancy.

---

### 4.4 `credentials`

Referencias a material secreto (certificado digital, SOL, OAuth GRE). **No** columnas `password` / `pfx_bytes`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK | denormalizado para queries |
| `company_id` | uuid NOT NULL FK → companies | |
| `kind` | text NOT NULL | `certificate` \| `sol` \| `gre` |
| `status` | text NOT NULL | |
| `secret_ref` | text NOT NULL | URI vault / KMS key id / path cifrado S3 |
| `public_metadata` | jsonb NOT NULL DEFAULT `{}` | p.ej. `subject_cn`, `not_after`, `sol_username` (sin password), `gre_client_id` |
| `rotated_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

Constraints:

- `UNIQUE (company_id, kind)` en MVP (un cert, un SOL, un GRE por company).
- Índice `(organization_id, company_id)`.

`public_metadata.not_after` alimenta `certificate_status` en API (`missing` | `active` | `expired`).

---

### 4.5 `document_series`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK | |
| `company_id` | uuid NOT NULL FK → companies | |
| `document_type` | text NOT NULL | `01`, `03`, `07`, `08`, `09`, `31`, `RA`, `RC` |
| `serie` | text NOT NULL | `F001`, `B001`, `T001`, … |
| `next_number` | bigint NOT NULL DEFAULT 1 | próximo a asignar |
| `padding` | int NOT NULL DEFAULT 8 | ancho correlativo |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `created_at` / `updated_at` | timestamptz | |

Constraints / índices:

- `UNIQUE (company_id, document_type, serie)`.
- `(organization_id, company_id)`.

#### Estrategia de locking de correlativos

Transacción corta en el use case de emisión (post pre-validación exitosa, pre-firma o al confirmar emisión — según pipeline):

```text
BEGIN;
SELECT next_number FROM document_series
  WHERE id = :series_id AND company_id = :company_id
  FOR UPDATE;

-- asignar number = next_number
UPDATE document_series
  SET next_number = next_number + 1, updated_at = now()
  WHERE id = :series_id;

INSERT/UPDATE documents SET serie, number, serie_number, …;
COMMIT;
```

Reglas (ADR-001):

| Momento | Correlativo |
| --- | --- |
| Fallo antes de firmar / antes de wire SUNAT | **Liberar:** `next_number` rollback (transacción aborta) o decremento compensatorio si ya se commitió pre-wire — preferir **no commitir número hasta pasar prevalidación**; si se persistió `draft` sin número, mejor |
| Timeout / fallo post-`SendBill` o REST GRE | **Retener** número en `documents`; no devolver a pool |
| CDR `rejected` | **Consumido**; no reutilizar |
| Retry `failed` | Mismo `documents.number`; no incrementar serie |

Huecos: aceptables solo cuando hubo wire o rechazo SUNAT. Evitar huecos por validación local fallida.

Opcional v1.1: columna `reserved_until` + job de liberación para reservas soft; **fuera del MVP** si la asignación es atómica en la misma TX que crea el documento validado.

---

### 4.6 `documents`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK | |
| `company_id` | uuid NOT NULL FK | |
| `document_type` | text NOT NULL | |
| `serie` | text NULL | null solo en `draft` sin asignación |
| `number` | bigint NULL | |
| `serie_number` | text NULL | `F001-00000123` / `RA-YYYYMMDD-#####` |
| `status` | text NOT NULL | enum §3.1 |
| `environment` | text NOT NULL | copia de company al emitir (inmutable) |
| `issue_date` | date NULL | |
| `currency` | char(3) NULL | |
| `customer_identity_type` | text NULL | denormalizado para listados |
| `customer_identity_number` | text NULL | |
| `customer_name` | text NULL | |
| `totals` | jsonb NULL | resumen montos |
| `payload` | jsonb NOT NULL | request canónico (JSON API) |
| `payload_hash` | text NOT NULL | sha256 canónico para idempotencia |
| `sunat_ticket` | text NULL | |
| `sunat_response_code` | text NULL | p.ej. `0`, `98`, códigos CDR |
| `sunat_response_message` | text NULL | |
| `ubl_profile` | text NULL | Invoice / CreditNote / … |
| `ruleset_version` | text NULL | pin efectivo al validar |
| `related_document_id` | uuid NULL FK → documents | NC/ND/RA referencias internas opcionales |
| `idempotency_key` | text NULL | denormalizado; ver tabla dedicada |
| `error` | jsonb NULL | último error FACTOSYS tipado |
| `queued_at` / `sent_at` / `completed_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

Constraints / índices:

- `UNIQUE (company_id, document_type, serie, number)` WHERE `number IS NOT NULL`.
- `UNIQUE (organization_id, company_id, idempotency_key)` WHERE `idempotency_key IS NOT NULL`.
- `(organization_id, company_id, created_at DESC)`.
- `(organization_id, company_id, status)`.
- `(company_id, sunat_ticket)` WHERE ticket not null.
- `(company_id, serie_number)`.

`payload` en DB es la fuente de verdad del request; copia opcional en S3 solo si supera umbral de tamaño (MVP: OK en jsonb hasta ~1–2 MB).

---

### 4.7 `document_artifacts`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | |
| `company_id` | uuid NOT NULL | |
| `document_id` | uuid NOT NULL FK → documents ON DELETE CASCADE | |
| `kind` | text NOT NULL | ver enum |
| `storage_backend` | text NOT NULL DEFAULT `s3` | `s3` \| `db` (solo metadata pequeña) |
| `bucket` | text NULL | |
| `object_key` | text NULL | path S3 |
| `content_type` | text NULL | |
| `sha256` | text NOT NULL | |
| `size_bytes` | bigint NOT NULL | |
| `encryption` | text NULL | `sse-s3` \| `sse-kms` \| app-level |
| `created_at` | timestamptz | |

Índices:

- `UNIQUE (document_id, kind)` — una versión “current” por kind; si se re-firma, sobrescribir o versionar con `kind=xml_signed` + `version` (MVP: replace row + overwrite S3 key versionada).
- `(organization_id, company_id, document_id)`.

---

### 4.8 `document_events` (timeline)

Append-only; alimenta `GET /documents/{id}` trace / OpenAPI timeline.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | |
| `company_id` | uuid NOT NULL | |
| `document_id` | uuid NOT NULL FK | |
| `at` | timestamptz NOT NULL DEFAULT now() | |
| `status` | text NOT NULL | status resultante |
| `from_status` | text NULL | |
| `detail` | text NULL | mensaje corto |
| `source` | text NOT NULL | `api` \| `worker` \| `sunat` \| `system` |
| `data` | jsonb NOT NULL DEFAULT `{}` | códigos SUNAT, job id, etc. **sin secretos** |

Índices: `(document_id, at)`, `(organization_id, company_id, at DESC)`.

---

### 4.9 `webhook_endpoints`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL FK | tenancy de suscripción a nivel org (OpenAPI actual) |
| `company_id` | uuid NULL | null = todos los RUC de la org; o filtrar por company si se define después |
| `url` | text NOT NULL | solo `https://` |
| `events` | text[] NOT NULL | MVP: `{document.status_changed}` |
| `status` | text NOT NULL DEFAULT `active` | |
| `secret_hash` | text NOT NULL | hash del secreto HMAC |
| `secret_encrypted` | bytea NULL | o `secret_ref` vault — necesario para firmar outbound |
| `secret_hint` | char(4) NOT NULL | últimos 4 |
| `consecutive_failures` | int NOT NULL DEFAULT 0 | |
| `disabled_at` | timestamptz NULL | |
| `last_success_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

Índices: `(organization_id, status)`.

Ver ADR-004 para firma, retries y umbral de disable.

---

### 4.10 `webhook_deliveries`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | = `delivery_id` en payload |
| `organization_id` | uuid NOT NULL | |
| `endpoint_id` | uuid NOT NULL FK → webhook_endpoints | |
| `document_id` | uuid NULL FK | |
| `event_type` | text NOT NULL | `document.status_changed` |
| `idempotency_key` | text NOT NULL | estable: `{endpoint_id}:{document_id}:{status}:{event_seq}` |
| `payload` | jsonb NOT NULL | cuerpo enviado |
| `status` | text NOT NULL | `pending` \| `success` \| `failed` |
| `attempt_count` | int NOT NULL DEFAULT 0 | |
| `next_attempt_at` | timestamptz NULL | |
| `http_status` | int NULL | |
| `response_excerpt` | text NULL | truncado, sin eco de secretos |
| `last_error` | text NULL | |
| `created_at` / `updated_at` | timestamptz | |

Índices:

- `UNIQUE (endpoint_id, idempotency_key)`.
- `(status, next_attempt_at)` WHERE `status = 'pending'` — worker BullMQ / poller.
- `(document_id)`, `(endpoint_id, created_at DESC)`.

---

### 4.11 `catalog_versions`

Catálogos globales FACTOSYS (no por tenant). Pin por company en `companies.catalog_pin` (ADR-005).

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `kind` | text NOT NULL | `ruleset_excel`, `anexo_vii`, `rs340`, … |
| `version` | text NOT NULL | p.ej. `2026-08-26` |
| `source_filename` | text NULL | |
| `source_sha256` | text NOT NULL | |
| `effective_from` | date NULL | |
| `effective_to` | date NULL | |
| `is_default` | boolean NOT NULL DEFAULT false | default plataforma por kind |
| `artifact_path` | text NOT NULL | path relativo repo/S3 export `artifacts/catalogs/…` |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | |
| `created_at` | timestamptz | |

`UNIQUE (kind, version)`.

Parcial único: como máximo un `is_default = true` por `kind`.

---

### 4.12 `catalog_items`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `catalog_version_id` | uuid NOT NULL FK → catalog_versions ON DELETE CASCADE | |
| `catalog_code` | text NOT NULL | p.ej. `01`, `06`, `07` Anexo V/VII / código hoja |
| `item_code` | text NOT NULL | valor SUNAT |
| `description` | text NULL | |
| `attrs` | jsonb NOT NULL DEFAULT `{}` | flags, fechas vigencia, aliases |
| `created_at` | timestamptz | |

Índices: `UNIQUE (catalog_version_id, catalog_code, item_code)`, `(catalog_version_id, catalog_code)`.

Para ruleset Excel puede preferirse **no** explotar fila-a-fila todas las reglas en MVP y guardar el workbook compilado en artifact + hash en `catalog_versions`; `catalog_items` prioriza catálogos código/descripción (Anexo VII, RS-340, ubigeo).

---

### 4.13 `idempotency_keys`

Persistencia durable (además de lock corto en Redis).

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | |
| `company_id` | uuid NOT NULL | |
| `key` | text NOT NULL | header `Idempotency-Key` |
| `request_hash` | text NOT NULL | hash del body canónico |
| `request_path` | text NOT NULL | p.ej. `POST /v1/companies/{id}/invoices` |
| `status` | text NOT NULL | `in_progress` \| `completed` \| `expired` |
| `document_id` | uuid NULL FK | resultado |
| `response_code` | int NULL | HTTP cacheado |
| `response_body` | jsonb NULL | respuesta compacta cacheada |
| `expires_at` | timestamptz NOT NULL | p.ej. now() + 24h |
| `created_at` / `updated_at` | timestamptz | |

Constraints:

- `UNIQUE (organization_id, company_id, key)`.
- Si misma key + distinto `request_hash` → API `FACTOSYS_IDEMPOTENCY_CONFLICT` (409).

Índice: `(expires_at)` para GC.

Redis: lock `SET NX` durante el request para serializar races; Postgres es fuente de verdad post-commit.

---

### 4.14 `audit_events`

No-repudio interno / seguridad (`07-seguridad`).

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid NULL | |
| `company_id` | uuid NULL | |
| `actor_type` | text NOT NULL | `api_key` \| `system` \| `worker` \| `support` |
| `actor_id` | text NULL | api_key id, job name |
| `action` | text NOT NULL | `company.created`, `credential.rotated`, `document.retry`, `webhook.secret_rotated`, … |
| `resource_type` | text NULL | |
| `resource_id` | text NULL | |
| `ip` | inet NULL | |
| `user_agent` | text NULL | |
| `data` | jsonb NOT NULL DEFAULT `{}` | **redactado** (nunca SOL/pfx/webhook secret completo) |
| `created_at` | timestamptz NOT NULL | |

Índices: `(organization_id, created_at DESC)`, `(resource_type, resource_id)`.

Retención: configurable; no UPDATE.

---

## 5. Qué vive en S3 vs Postgres

| Dato | Postgres | S3 |
| --- | --- | --- |
| Organization / company / series / estados | Sí | No |
| JSON request canónico | Sí (`documents.payload`) | Opcional mirror si size grande |
| XML sin firmar | Metadata fila | Objeto (solo sandbox / debug) |
| XML firmado, ZIP, CDR, PDF | Metadata + hash | Objeto obligatorio |
| PFX / secretos | `secret_ref` + metadata pública | Objeto cifrado o vault externo |
| Catálogos versionados export | `catalog_versions.artifact_path` | Y/o git `docs/…/artifacts/catalogs/` |
| Webhook payload | Sí (`webhook_deliveries.payload`) | No |
| Audit / timeline | Sí | No |
| Logs de aplicación | No (observabilidad) | No en este modelo |

Convención de keys S3:

```text
org/{organization_id}/company/{company_id}/documents/{document_id}/{kind}/{sha256}.{ext}
org/{organization_id}/company/{company_id}/credentials/{kind}/{credential_id}
```

URLs de API (`/xml`, `/cdr`, `/pdf`) generan links firmados de corta vida; **no** poner URLs permanentes ni credenciales en webhooks.

---

## 6. Orden de migraciones (recomendado)

1. Extensiones: `pgcrypto` (gen_random_uuid) si hace falta.
2. `organizations`
3. `api_keys`
4. `companies`
5. `credentials`
6. `document_series`
7. `documents`
8. `document_artifacts`
9. `document_events`
10. `idempotency_keys`
11. `webhook_endpoints`
12. `webhook_deliveries`
13. `catalog_versions`
14. `catalog_items`
15. `audit_events`
16. Seeds: organization demo + catalog_versions default (ruleset `2026-08-26`) sin secretos.
17. `permissions` + `roles` + `role_permissions` (seed matriz [33](33-console-ui-y-rbac.md))
18. `users` + `user_roles`

Cada migración: up/down; índices UNIQUE parciales en el mismo step que la tabla.

### 6.1 Tablas RBAC / consola

Detalle de columnas: [33 §2](33-console-ui-y-rbac.md). Resumen:

- `users` (organization_id, email, password_hash, status)
- `roles`, `permissions`, `role_permissions`, `user_roles`

Diagrama lógico ampliado:

```
organizations 1──* users *──* roles *──* permissions
       │
       └──* api_keys   (máquina; scopes ≠ permissions RBAC)
```

---

## 7. Relación con Redis / BullMQ (no tablas, pero contrato)

| Uso Redis | Clave conceptual |
| --- | --- |
| Lock idempotencia corta | `idem:{org}:{company}:{key}` TTL 60s |
| Rate limit | `rl:{org}` / `rl:{company}` |
| Colas | `sunat-send`, `sunat-poll`, `webhooks`, `pdf-render` |

Jobs referencian solo UUIDs; el worker carga filas con filtro tenancy.

---

## 8. Fuera de alcance (este documento / MVP DB)

- Tablas SIRE / RVIE / RCE.
- Homologación OSE / multi-contribuyente OSE.
- Multi-país / multi-moneda ledger contable.
- Soft-delete de `documents` con retención legal avanzada (solo diseño futuro).
- Particionamiento por mes de `documents` / `audit_events` (evaluar >10M filas).
- Outbox transaccional genérico (MVP: insert `document_events` + enqueue en misma TX app; mejorar con outbox si hace falta).
- RBAC por-company (MVP = roles a nivel organization; ver 33).
- Replicación read-replica (ops).

---

## 9. Checklist de implementación

- [ ] Todo repository exige `organization_id` (+ `company_id` cuando aplique).
- [ ] Tests de carrera en correlativos (`FOR UPDATE`).
- [ ] Tests idempotencia: mismo key+body → mismo document; body distinto → 409.
- [ ] Redacción en `audit_events.data` y logs.
- [ ] Migraciones aplicadas en CI antes de spikes de persistencia (post A–C emisión).
