# 06 — Stack tecnológico

Decisiones de tecnología para FACTOSYS. Sin costos ni sizing de equipo.

## 1. Resumen ejecutivo

| Área | Elección |
| --- | --- |
| Lenguaje backend | **TypeScript** |
| Framework API | **NestJS** |
| Arquitectura | Clean architecture (módulos Nest = adapters) |
| Base de datos | **PostgreSQL** |
| Cache / colas | **Redis** + **BullMQ** |
| Object storage | **S3-compatible** (MinIO en local/dev) |
| API contract | **OpenAPI 3** |
| Validación de entrada | **Zod** o class-validator (una sola; preferencia Zod en domain edges) |
| XML | `fast-xml-parser` / `libxmljs2` (XSD) — evaluar en spike |
| Firma XMLDSig | Librería Node con soporte XAdES/XMLDSig (spike obligatorio) |
| PDF | Plantillas HTML→PDF (**Playwright** o **Puppeteer**) o motor tipográfico ligero |
| Auth API propia | API keys + JWT de sesión consola |
| Observabilidad | OpenTelemetry + logs JSON estructurados |
| Contenedores | Docker + Docker Compose |
| CI | GitHub Actions (lint, test, build) |
| Frontend futuro | React + arquitectura modular (design system propio) |
| Monorepo (recomendado) | pnpm workspaces o Turborepo: `apps/api`, `packages/*` |

## 2. Por qué TypeScript + NestJS

| Criterio | Justificación |
| --- | --- |
| SOAP + REST en el mismo servicio | Ecosistema Node maduro para ambos |
| Tipado extremo a extremo | OpenAPI → tipos; menos drift JSON↔UBL |
| Clean architecture | Nest permite ports/adapters sin atar el dominio |
| DX del equipo peruano | Alta disponibilidad de talento Node/TS |
| Reutilización | Mismo lenguaje para workers y API |

**Alternativa descartada para v1:** Java/Spring (excelente para OSE enterprise, más pesado para API-first lean) y .NET (válido, pero no es el default del repo).

## 3. Persistencia

### PostgreSQL

Tablas núcleo (conceptuales):

- `organizations`, `api_keys`
- `companies` (RUC, razón social, config)
- `credentials` (refs cifradas; secret material en vault/storage)
- `document_series` (tipo, serie, next_number, lock)
- `documents` (tipo, estado, idempotency_key, sunat_ticket…)
- `document_artifacts` (paths, hashes)
- `webhook_endpoints`, `webhook_deliveries`
- `catalog_versions`, `catalog_items`
- `audit_events`

### Redis

- Idempotency keys de corto plazo
- Rate limiting
- Colas BullMQ: `sunat-send`, `sunat-poll`, `webhooks`, `pdf-render`

## 4. Componentes críticos y spikes

Antes de congelar librerías XML/firma, ejecutar spikes:

| Spike | Éxito |
| --- | --- |
| Generar Invoice UBL 2.1 mínimo y validar con XSD oficial | XML válido |
| Firmar con certificado de prueba y verificar | Firma aceptada por validador / SFS |
| `SendBill` a beta SUNAT | CDR recibida |
| OAuth2 GRE + envío de prueba | HTTP 200/ticket |
| Parsear Excel de reglas a motor ejecutable | Al menos N reglas críticas automatizadas |

## 5. Estructura de monorepo (propuesta)

```
apps/
  api/                 NestJS HTTP + workers
  console/             (futuro) React
packages/
  domain/              entidades CPE, estados, correlativos
  sunat-ubl/           builders JSON→UBL
  sunat-validation/    XSD + reglas
  sunat-soap/          cliente billService
  sunat-gre/           cliente REST GRE
  sunat-catalogs/      catálogos versionados
  pdf-ri/              representación impresa
  shared/              logging, errors, config
docs/                  este repo de planificación + sunat-oficial
```

En la fase de planificación el monorepo **aún no se crea**; procedimiento de apertura: [23-monorepo-bootstrap.md](23-monorepo-bootstrap.md). Spikes: [24-plan-spikes-emision.md](24-plan-spikes-emision.md). Separación UBL/firma: [ADR-003](adr/003-separacion-ubl-sign.md).

## 6. Contratos y calidad

| Práctica | Herramienta |
| --- | --- |
| Lint | ESLint + Prettier |
| Test unitario | Vitest o Jest |
| Test integración | testcontainers (Postgres/Redis) |
| Contract test | schemas OpenAPI + ejemplos golden XML |
| Build | `npm run build` / `pnpm build` obligatorio post-cambios |

## 7. Infraestructura (lógica, no proveedor cerrado)

| Concern | Enfoque |
| --- | --- |
| Secrets | Variables de entorno + KMS/vault para unwrap de certificados |
| TLS | Obligatorio en edge |
| Backups | Postgres PITR; artefactos versionados en object storage |
| Regions | Preferible región cercana a Perú / LatAm para latencia a SUNAT |
| IaC | Terraform o equivalente cuando exista cloud |

Proveedor cloud concreto (AWS/GCP/Azure) se elige al desplegar; no bloquea el diseño.

## 8. Qué no entra en el stack v1

- Kafka (BullMQ alcanza)
- Microservicios por documento (modular monolith primero)
- Elasticsearch obligatorio (Postgres full-text basta al inicio)
- Mobile apps nativas

## 9. Alineación con reglas del proyecto

- Backend: **clean architecture**.
- Frontend: **modular**, reutilizar componentes; crear solo si no existen.
- Tras editar backend/frontend en el futuro: correr **`npm run build`**.
