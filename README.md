# FACTOSYS — Planificación de APIs de facturación electrónica (Perú)

Repositorio de **planificación y documentación**. Código de producto según backlog de sprints.

Objetivo: APIs de facturación electrónica en Perú predecibles de integrar, ancladas a normativa SUNAT.

## Contenido

| Ruta | Contenido |
| --- | --- |
| [docs/sunat-oficial](docs/sunat-oficial) | Biblioteca oficial SUNAT |
| [docs/planificacion](docs/planificacion) | Diseño + backlog |

## Empezar por aquí

1. [docs/planificacion/README.md](docs/planificacion/README.md)
2. **[32-backlog-sprints-mvp.md](docs/planificacion/32-backlog-sprints-mvp.md)** — sprints S0–S11
3. **[33-console-ui-y-rbac.md](docs/planificacion/33-console-ui-y-rbac.md)** — pantallas + roles
4. [23](docs/planificacion/23-monorepo-bootstrap.md) · [24](docs/planificacion/24-plan-spikes-emision.md) — al abrir código

## Decisiones

- **v1 API:** SEE contribuyente (no OSE).
- **Stack:** TypeScript, NestJS, PostgreSQL, Redis/BullMQ, Drizzle, OpenAPI.
- **MVP+:** consola React con RBAC (S10–S11), sin bloquear API-first (DoD en S9).
