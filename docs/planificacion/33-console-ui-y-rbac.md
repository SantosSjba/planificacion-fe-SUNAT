# 33 — Consola UI (campo a campo) y RBAC

Estado: **Aprobado (planificación de producto)**.  
Fecha: 2026-09-18  
Backlog: [32-backlog-sprints-mvp.md](32-backlog-sprints-mvp.md) · Arquitectura UI: [05 §9](05-arquitectura.md) · Seguridad: [07](07-seguridad-y-cumplimiento.md)

Stack console: **Vite + React + TypeScript**, módulos `auth`, `users`, `companies`, `documents`, `gre`, `developers`. Auth humana = **JWT**; integraciones máquina = **API keys** (scopes OpenAPI).

## 1. Modelo RBAC

### Roles MVP

| Rol | Descripción |
| --- | --- |
| `owner` | Dueño org; todo + transfer/billing futuro |
| `admin` | Opera empresas, users (no borrar owner), credenciales |
| `operator` | Emitir/consultar CPE/GRE/RA/RC; no keys/secrets |
| `developer` | API keys, webhooks, validez, lectura docs; no credenciales SOL/pfx |
| `viewer` | Solo lectura documentos/empresas (sin secretos) |

### Permisos atómicos

`users:read|write` · `companies:read|write` · `credentials:manage` · `series:read|write` · `documents:read|write` · `gre:read|write` · `apikeys:manage` · `webhooks:manage` · `validations:cpe` · `audit:read` · `catalog:read`

### Matriz (R=read implícito donde write)

| Permiso | owner | admin | operator | developer | viewer |
| --- | --- | --- | --- | --- | --- |
| users:* | sí | sí | no | no | read-only no |
| companies:write | sí | sí | no | no | no |
| credentials:manage | sí | sí | no | no | no |
| series:write | sí | sí | sí | no | no |
| documents:write | sí | sí | sí | no | no |
| gre:write | sí | sí | sí | no | no |
| apikeys:manage | sí | sí | no | sí | no |
| webhooks:manage | sí | sí | no | sí | no |
| validations:cpe | sí | sí | sí | sí | no |
| audit:read | sí | sí | no | sí | no |
| *:read docs/companies | sí | sí | sí | sí | sí |

### API consola (además de API keys máquina)

| Método | Path | Permiso |
| --- | --- | --- |
| POST | `/auth/login` | público |
| POST | `/auth/refresh` | refresh token |
| POST | `/auth/logout` | sesión |
| GET/POST | `/organizations/me/users` | users:read/write |
| PATCH | `/organizations/me/users/{id}` | users:write |
| GET | `/organizations/me/roles` | users:read |

Primer usuario org = `owner` en seed/signup. API keys siguen con **scopes** OpenAPI (máquina); JWT usa **permissions** RBAC (humano).

---


## 2. Tablas Postgres (ampliación a doc 26)

### `users`

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| organization_id | uuid FK | tenancy |
| email | citext UNIQUE (org) | |
| name | text | |
| password_hash | text | Argon2id |
| status | text | active \| disabled |
| last_login_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

### `roles` / `permissions`

| Tabla | Columnas clave |
| --- | --- |
| roles | id, code UNIQUE (`owner`…), name, description |
| permissions | id, code UNIQUE (`documents:write`…), description |
| role_permissions | role_id, permission_id PK compuesta |
| user_roles | user_id, role_id PK compuesta |

Índices: `(organization_id, email)`, `(user_id)` en user_roles.

Seed: 5 roles + matriz de §1; primer usuario de org = `owner`.


## 3. Pantallas console — campos

Leyenda: **R**=required · **O**=optional · **RO**=read-only · **WO**=write-only (nunca se relee)

### P-LOGIN

| Campo | Tipo | Regla |
| --- | --- | --- |
| email | email | R |
| password | password | R min 8 |
| CTA | Entrar | |
| link | Olvidé contraseña | v2 stub disabled o mailto |

### P-USERS-LIST

| Columna/filtro | Notas |
| --- | --- |
| filtros | email, rol, status active/disabled |
| columnas | email, name, roles[], status, last_login_at |
| acciones | Invitar (perm write) |

### P-USERS-FORM / DETAIL

| Campo | Tipo | Regla |
| --- | --- | --- |
| email | email | R unique org |
| name | text | R |
| roles | multi-select | R ≥1 de roles MVP |
| status | select | active/disabled |
| temporary_password | WO | solo create; forzar change v2 opcional |

### P-CO-LIST

| Campo | Notas |
| --- | --- |
| filtros | ruc, environment, status |
| columnas | ruc, legal_name, environment, cert_status, updated_at |

### P-CO-FORM (create/edit)

| Campo | Tipo | Regla |
| --- | --- | --- |
| ruc | string(11) | R checksum |
| legal_name | text | R |
| trade_name | text | O |
| environment | select sandbox/production | R |
| address.line | text | O |
| address.ubigeo | text | O |
| timezone | text | default America/Lima |

### P-CO-DETAIL-OVERVIEW (RO)

ruc, legal_name, environment, cert_status, sol_configured (bool), gre_configured (bool), ruleset_version, created_at

### P-CO-CERT

| Campo | Tipo | Regla |
| --- | --- | --- |
| pfx_file | file | R .pfx/.p12 |
| pfx_password | password WO | R |
| RO | subject_cn, not_before, not_after, status | post-upload |

### P-CO-SOL

| Campo | Tipo | Regla |
| --- | --- | --- |
| sol_username | text | R (RUC+USER) |
| sol_password | password WO | R |
| RO | configured_at, last_ok_at | |

### P-CO-GRE

| Campo | Tipo | Regla |
| --- | --- | --- |
| client_id | text | R |
| client_secret | password WO | R |
| RO | configured_at | |

### P-CO-SERIES

| Campo | Tipo | Regla |
| --- | --- | --- |
| document_type | select 01/03/07/08/09/31/RA/RC | R |
| serie | text(4) | R pattern |
| next_number | number RO | |
| is_active | toggle | |
| CTA | Crear serie | |

### P-DOC-LIST

| Filtro/columna | Notas |
| --- | --- |
| filtros | company_id, document_type, status, date_from/to, serie_number q |
| columnas | type, serie_number, issue_date, customer_name, status, sunat_code, created_at |
| acciones | Ver; Emitir (si write) |

### P-DOC-DETAIL

| Bloque | Campos |
| --- | --- |
| header | type, serie_number, status badge, environment |
| parties | customer identity_type/number/name |
| totals | currency, payable, igv summary JSON |
| sunat | ticket, response_code, message |
| timeline | at, status, detail, source |
| artifacts | botones XML / CDR / PDF (perm read) |
| error | code, message, sunat_code, details[] |

### P-INV-WIZARD (Factura — steps)

**Step 1 Cabecera:** company_id (RO si contexto), serie (select), number O, operation_type R, issue_date R, issue_time O, currency R (PEN default), due_date O, purchase_order O, totals_mode auto/strict, Idempotency-Key auto-uuid RO copyable

**Step 2 Cliente:** identity_type R, identity_number R, name R, email O, address.ubigeo/line/district/province/department/country O

**Step 3 Líneas (1..n):** id, quantity, unit_code, description, unit_value, unit_price O, tax_affectation R, igv_percent O, tax_scheme_id R, product_code O — CTA add/remove line

**Step 4 Extras O:** legends[], detraction{code,percent,amount,currency,bank_account}, payment_means[]

**Step 5 Review:** JSON preview + Validar (local) + Emitir

Validación UI: schema invoice-create + matriz 07×05 antes de POST.

### P-BOL-WIZARD

Igual Invoice con: document implícito 03, serie B*, customer tip. DNI/etc, `include_in_daily_summary` toggle default true, `send_individually` O

### P-NC-WIZARD / P-ND-WIZARD

Cabecera + cliente + líneas + **affected_document**{document_type, serie_number} R + **note_type** (cat 09/10) R + motivo/description R

### P-RA-FORM

| Campo | Regla |
| --- | --- |
| company_id | R |
| reference_date | R |
| issue_date | O |
| documents[] | R min1: document_type, serie_number\|serie+number, reason R |

### P-RC-FORM

| Campo | Regla |
| --- | --- |
| company_id | R |
| reference_date | R |
| mode | auto (default) \| manual lines |
| document_ids[] | O si auto |
| lines[] | si manual: document_id\|serie_number, status 1\|2\|3 |

### P-GRE-WIZARD-09

| Bloque | Campos |
| --- | --- |
| header | document_type=09 RO, serie T*, issue_date R, issue_time O, notes O |
| delivery_customer | identity_type/number/name R |
| shipment | transfer_reason_code R, transfer_reason_text C, transport_mode_code R, gross_weight+unit R, start_date R, total_packages O |
| carrier | si mode público: identity_* + name (shipment.carrier) |
| vehicles/drivers | si mode privado: plate R; driver identity+name+license C |
| origin/destination | ubigeo+address R; establishment_code O |
| related_documents[] | document_type + serie_number |
| lines[] | id, quantity, unit_code, description R |

### P-GRE-WIZARD-31

Como 09 + **shipper** R (remitente) + vehicles/drivers **license R** + serie V*; related a GRE 09 O

### P-GRE-LIST / DETAIL

Analog P-DOC-* con document_type 09/31; sin montos

### P-KEYS

| Campo | Regla |
| --- | --- |
| name | R |
| scopes | multi-select documents:read/write, credentials:manage, webhooks:manage, validations:cpe |
| environment_constraint | O sandbox/production/both |
| secret | mostrado **una vez** al crear WO |
| lista | prefix, scopes, status, last_used_at, revoke CTA |

### P-HOOKS

| Campo | Regla |
| --- | --- |
| url | https R |
| events | checklist document.status_changed |
| secret | una vez + rotate |
| status | active/disabled |
| deliveries table | id, status, attempt_count, http_status, created_at |

### P-AUDIT

filtros action, actor, date; columnas created_at, actor, action, resource_type/id; detail drawer data redactado

### P-VALID

| Campo | Regla |
| --- | --- |
| company_id | R (credenciales consulta) |
| ruc | R emisor |
| document_type | R |
| serie | R |
| number | R |
| issue_date | R |
| total_amount | R |
| resultado | cpe_status + labels + cached + checked_at |

---

## 4. Navegación y permisos de menú

| Ítem nav | Permiso mínimo |
| --- | --- |
| Empresas | companies:read |
| Usuarios | users:read |
| Comprobantes | documents:read |
| GRE | gre:read (o documents:read) |
| API keys | apikeys:manage |
| Webhooks | webhooks:manage |
| Auditoría | audit:read |
| Validez CPE | validations:cpe |

Ocultar ítems sin permiso (no solo deshabilitar).

## 5. Fuera de MVP console

SSO/SAML, forgot-password self-service, permisos custom por UI, RBAC por-company (solo org-level en MVP), POS/inventario.
