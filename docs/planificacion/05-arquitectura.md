# 05 — Arquitectura

Arquitectura objetivo del producto. Backend en **clean architecture**; cualquier UI futura en **arquitectura modular**.

## 1. Vista de contexto

```
[ERP / SaaS / App cliente]
          │  HTTPS + API key / JWT
          ▼
┌─────────────────────────────────────┐
│           FACTOSYS API               │
│  Auth │ Tenancy │ Idempotency │ DX   │
└──────────────┬──────────────────────┘
               │
     ┌─────────┼─────────┬──────────────┐
     ▼         ▼         ▼              ▼
 [Emisión] [Firma]  [Envío SUNAT]  [Consulta]
     │         │         │              │
     └────┬────┴────┬────┘              │
          ▼         ▼                   ▼
     [PostgreSQL] [Redis/BullMQ]   [Object storage]
          │
          ▼
   Webhooks → cliente
```

SUNAT queda **fuera** del hexágono: adaptadores SOAP y REST.

## 2. Bounded contexts

| Contexto | Responsabilidad |
| --- | --- |
| **Identity & Tenancy** | Organizaciones, usuarios API, empresas (RUC), roles |
| **Credentials Vault** | Certificados `.pfx`, Clave SOL, client_id/secret GRE; cifrado en reposo |
| **Catalogs** | Catálogos SUNAT versionados (moneda, IGV, detracción, ubigeo…) |
| **Documents** | Modelo canónico, correlativos, idempotencia, ciclo de vida |
| **Validation** | XSD + motor de reglas (Excel/XSL) |
| **Xml Studio** | Compilar JSON→UBL, firmar XMLDSig, empaquetar ZIP |
| **Sunat Gateway** | Clientes SOAP CPE, REST GRE, REST validez, (v2) SIRE |
| **Async Orchestrator** | Colas: envío, poll de tickets, reintentos, webhooks |
| **Representation** | PDF / representación impresa |
| **Audit & Observability** | Traces, logs estructurados sin secretos, retención de artefactos |

## 3. Capas clean architecture (backend)

```
domain/          Entidades, value objects, políticas (CPE, correlativo, CDR)
application/     Casos de uso (EmitInvoice, SendSummary, PollTicket…)
infrastructure/  Postgres, Redis, SOAP, REST SUNAT, S3, firma
interfaces/      HTTP controllers, DTOs, OpenAPI, webhooks outbound
```

Regla: **domain e application no importan Nest ni TypeORM**. Los adaptadores SUNAT viven solo en infrastructure.

## 4. Flujo síncrono (factura 01)

```
POST /v1/invoices
  → auth + tenancy
  → idempotency lock
  → map DTO → dominio
  → assign series/correlative (reservado)
  → validate (XSD + reglas)
  → build UBL 2.1
  → sign
  → zip
  → SendBill (SOAP)
  → parse CDR
  → persist artifacts + status
  → enqueue webhook
  → response 201/202 con estado
```

Si `SendBill` falla por red: estado `failed`, correlativo **retenido o liberado según política** (definir en ADR; default propuesto: retener si ya se envió el XML a SUNAT, liberar solo si falló antes del wire).

## 5. Flujo asíncrono (RC / RA / GRE ticket)

```
POST → validate → sign → SendSummary/REST
  → save ticket
  → status = ticket_pending
  → worker poll getStatus / GRE status
  → CDR → accepted|rejected
  → webhook
```

## 6. Multi-tenant

| Nivel | Ejemplo |
| --- | --- |
| Organization | Software house o SaaS cliente de FACTOSYS |
| Company (RUC) | Emisor electrónico |
| Series | F001, B001, T001… |
| API credential | Key de la organization |

Todo query de documentos filtra por `organization_id` + `company_id`.

## 7. Almacenamiento de artefactos

Por cada comprobante guardar:

- Request canónico (JSON)
- XML sin firmar (opcional, solo sandbox)
- XML firmado
- ZIP enviado
- CDR XML
- PDF
- Metadatos: ticket, hash, timestamps, código error SUNAT

Object storage (S3-compatible) + metadatos en Postgres.

## 8. Integraciones externas

| Sistema | Protocolo | Auth |
| --- | --- | --- |
| SUNAT CPE beta/prod | SOAP 1.1/1.2 | WS-Security UsernameToken |
| SUNAT GRE | REST | OAuth2 password grant (SOL + client credentials) |
| SUNAT validez | REST | Bearer token |
| SUNAT SIRE (v2) | REST | Según manual SIRE |
| Cliente FACTOSYS | REST | API key o OAuth2 propio |
| Webhook cliente | HTTPS POST | HMAC signature |

## 9. Modularidad frontend (MVP+ — sprints S10–S11)

Consola `apps/console` (Vite + React + TS). Spec pantallas/RBAC: [33-console-ui-y-rbac.md](33-console-ui-y-rbac.md). Backlog: [32](32-backlog-sprints-mvp.md).

Módulos:

- Auth (JWT sesión)
- Usuarios / roles (RBAC org-level)
- Empresas / certificados / SOL / GRE / series
- Comprobantes (lista, detalle, wizards emisión, RA/RC)
- GRE
- Desarrolladores (API keys, webhooks, auditoría, validez)

**No bloquea** el DoD API-first (fin sprint S9).

## 10. ADRs

| ADR | Tema | Estado |
| --- | --- | --- |
| [001](adr/001-correlativos-ante-fallos.md) | Correlativos ante fallo | Aceptado |
| [002](adr/002-libreria-firma-xmldsig.md) | Librería firma XMLDSig | Propuesto (spike A) |
| [003](adr/003-separacion-ubl-sign.md) | `sunat-ubl` ≠ `sunat-sign` | Aceptado |
| [004](adr/004-webhooks.md) | Webhooks HMAC / retries | Aceptado |
| [005](adr/005-versionado-catalogos-sunat.md) | Versionado catálogos / ruleset | Aceptado |

Pendiente al implementar (no ADR formal aún): outbox transaccional si BullMQ+Postgres lo exige.
