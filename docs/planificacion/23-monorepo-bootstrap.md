# 23 — Bootstrap del monorepo (plan, sin código aún)

Cuándo ejecutar: **después** de cerrar esta fase de planificación, en un PR de scaffolding.  
Este documento es la checklist y el diseño; **no** crea `apps/` ni `packages/` todavía.

Fuente de layout: [06-stack-tecnologico.md](06-stack-tecnologico.md) §5 · capas: [05-arquitectura.md](05-arquitectura.md).

## 1. Objetivo del primer PR de código

Dejar un monorepo **compilable y vacío de negocio SUNAT**, listo para los spikes de [24](24-plan-spikes-emision.md).

| Entrega | Criterio de hecho |
| --- | --- |
| Tooling | `pnpm` workspaces (+ Turborepo opcional) en Node 20+ |
| Build | `pnpm build` pasa en todos los packages scaffold |
| Lint/test | ESLint + Vitest configurados; al menos 1 test smoke |
| Apps | `apps/api` NestJS con health `GET /health` |
| Packages | Esqueletos con `package.json` + `tsconfig` + export vacío |
| Docs | `docs/` permanece; no mover `sunat-oficial` |
| Secrets | `.env.example` sin valores reales; `.gitignore` para certs |

**Fuera del PR0:** builders UBL, SOAP, firma, Postgres migrations de dominio, OpenAPI servida.

## 2. Árbol objetivo (fase spikes)

```
facturacion-electronica/
  apps/
    api/                      # NestJS — solo health + wiring DI en PR0
  packages/
    domain/                   # entidades/VOs; sin Nest
    shared/                   # Result, AppError, logger types
    sunat-ubl/                # builders JSON→XML (spike 2)
    sunat-sign/               # SignXmlPort + impl spike 1 (separado de ubl)
    sunat-soap/               # billService client (spike 3)
    sunat-validation/         # stub; XSD/reglas post-spikes
    sunat-catalogs/           # stub versionado
    sunat-gre/                # stub; post-MVP-spike CPE
  docs/                       # planificación + sunat-oficial (ya existe)
  package.json                # private root
  pnpm-workspace.yaml
  turbo.json                  # opcional
  .env.example
  .gitignore
```

### Por qué `sunat-sign` aparte de `sunat-ubl`

Firma es el riesgo técnico #1 (ADR-002). Aislarla permite swap A→B→C sin reescribir builders.  
`sunat-ubl` solo produce XML canónico **sin** `ext:UBLExtensions` de firma; `sunat-sign` inserta la firma.

## 3. Clean architecture en `apps/api` (desde día 1)

```
apps/api/src/
  main.ts
  app.module.ts
  interfaces/http/          # controllers
  application/              # use cases (vacío en PR0)
  infrastructure/           # adapters (vacío en PR0)
```

Regla: `packages/domain` y `application` **no** importan `@nestjs/*`.

## 4. Decisiones de tooling (congelar en PR0)

| Tema | Decisión |
| --- | --- |
| Package manager | **pnpm** workspaces |
| TypeScript | Strict; project references o paths workspace |
| Test | **Vitest** |
| Lint/format | ESLint flat + Prettier |
| API framework | NestJS 10+ |
| Validación HTTP (luego) | Zod en edges (stack 06) |
| OpenAPI runtime | Diferido hasta existir 1 endpoint de emisión |

ADR sugerido al implementar: confirmar pnpm (no npm/yarn) — trivial, no requiere ADR formal.

## 5. Scripts root (contrato)

| Script | Comportamiento |
| --- | --- |
| `pnpm build` | Build de todos los packages + api |
| `pnpm test` | Unit tests |
| `pnpm lint` | ESLint |
| `pnpm spike:sign` | (añadir en spike 1) runner aislado |
| `pnpm spike:ubl` | (spike 2) |
| `pnpm spike:sendbill` | (spike 3; requiere secrets locales) |

Tras cualquier cambio de backend futuro: **`pnpm build`** (regla de proyecto; equivalente a `npm run build`).

## 6. `.gitignore` mínimo (plan)

- `node_modules/`, `dist/`, `.turbo/`
- `.env`, `.env.local`, `*.pfx`, `*.p12`, `certs/`, `secrets/`
- Artefactos de spike locales: `tmp/spikes/**` (XML/ZIP/CDR generados)

Los **fixtures JSON** de planificación siguen en `docs/planificacion/artifacts/fixtures/` (sin secretos).

## 7. Orden de merges sugerido

| PR | Contenido |
| --- | --- |
| PR0 | Este bootstrap |
| PR1 | Spike firma ([24](24-plan-spikes-emision.md) §A) → actualiza ADR-002 a Aceptado/Rechazado |
| PR2 | Spike Invoice UBL mínimo + golden XML |
| PR3 | Spike SendBill beta (o mock si no hay RUC) |
| PR4+ | API emisión real, DB, colas… |

No mezclar PR0 con lógica SUNAT.

## 8. Dependencias entre packages (spikes)

```
domain ← shared
sunat-ubl ← domain, shared
sunat-sign ← shared
sunat-soap ← shared
apps/api → (luego) application → ports → infrastructure → sunat-*
```

Durante spikes, runners CLI pueden vivir en `packages/sunat-sign/scripts` etc. **sin** pasar por Nest.

## 9. Checklist PR0 (copiar al abrir monorepo)

- [ ] `pnpm-workspace.yaml` con `apps/*`, `packages/*`
- [ ] `apps/api` health OK
- [ ] Packages listados en §2 con build vacío
- [ ] `pnpm build` / `pnpm test` / `pnpm lint` verdes
- [ ] `.env.example` + gitignore secrets
- [ ] README root apunta a docs de spikes
- [ ] CI GitHub Actions: install → lint → test → build (sin SUNAT)
