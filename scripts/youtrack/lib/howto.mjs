/**
 * Operational "Cómo hacerlo" steps per backlog ID (S0 from doc 23; stubs for later sprints).
 * Used to enrich parent issue descriptions for developers.
 */
import { docMdLink, linkifyDocsInText } from './github-docs.mjs';

export const HOWTO_BY_ID = {
  'S0-TOOL-01': [
    'Crear en la raíz del repo `package.json` con `"private": true` y name del monorepo.',
    'Crear `pnpm-workspace.yaml` con globs `apps/*` y `packages/*` (doc 23 §2 / §9).',
    'Crear `.nvmrc` con `20` (Node 20+).',
    'Verificar: `pnpm -v` y `pnpm list -r --depth -1` (o `pnpm m ls`) lista el workspace.',
  ],
  'S0-TOOL-02': [
    'Crear `tsconfig.base.json` con `strict: true` y paths `@factosys/*` → `packages/*/src`.',
    'Cada package/app extenderá este base; no compilar lógica SUNAT aún.',
    'Verificar: `tsc -b` o compile vacío sin errores.',
  ],
  'S0-TOOL-03': [
    'Configurar ESLint flat config en raíz; Prettier alineado.',
    'Ignore: `dist`, `node_modules`, `docs/sunat-oficial`.',
    'Script root `pnpm lint` debe pasar.',
  ],
  'S0-TOOL-04': [
    'Añadir Vitest en workspace; smoke test en `packages/shared` (o placeholder).',
    'Script root `pnpm test` debe pasar al menos 1 test.',
  ],
  'S0-TOOL-05': [
    'Definir en root `package.json` scripts: `build`, `test`, `lint`, `dev:api`.',
    'Stubs `spike:sign`, `spike:ubl`, `spike:sendbill` (doc 23 §5) aunque fallen hasta S1–S2.',
    'Documentar en README root.',
  ],
  'S0-TOOL-06': [
    'Opcional: `turbo.json` con pipeline build/test/lint y cache local.',
    'Si no se usa Turbo, dejar nota en README y cerrar tarea como “omitido a propósito”.',
  ],
  'S0-API-01': [
    'Scaffold NestJS 10+ en `apps/api` (CLI o plantilla mínima).',
    'Dependencias vía workspace; arranque con `pnpm dev:api` / `pnpm --filter api start`.',
    'Sin endpoints de negocio SUNAT.',
  ],
  'S0-API-02': [
    'Crear carpetas `apps/api/src/interfaces/http`, `application`, `infrastructure` (doc 23 §3).',
    'Regla: `packages/domain` y `application` no importan `@nestjs/*`.',
    'Dejar nota/README de capas en `apps/api`.',
  ],
  'S0-API-03': [
    'Integrar `@nestjs/config` + validación Zod de env.',
    'Crear `.env.example` sin secretos reales (doc 23 §1 / §9).',
    'La app debe fallar con mensaje claro si faltan vars requeridas.',
  ],
  'S0-API-04': [
    'Implementar `GET /health` y `GET /ready` (stub) devolviendo JSON 200.',
    'Sin dependencias a Postgres/Redis aún (ready puede ser stub).',
  ],
  'S0-API-05': [
    'Logger JSON (Pino o Nest logger) + middleware `request-id`.',
    'Redactar secrets en logs.',
  ],
  'S0-API-06': [
    'Exception filter: `AppError` → HTTP alineado al shape Error de OpenAPI (cuando exista).',
    'Test e2e mínimo de health + error tipado.',
  ],
  'S0-PKG-01': [
    'Crear `packages/shared` con export de `Result` y códigos `AppError` stub.',
    'Debe compilar y exportarse vía workspace.',
  ],
  'S0-PKG-02': [
    'Crear `packages/domain` con `DocumentStatus` enum y VOs vacíos.',
    'Sin imports de Nest (doc 23 §3 / §8).',
  ],
  'S0-PKG-03': [
    'Crear stubs: `sunat-ubl`, `sunat-sign`, `sunat-soap`, `sunat-validation`, `sunat-catalogs`, `sunat-gre`, `pdf-ri`.',
    'Cada uno: `package.json` + `tsconfig` + export vacío (árbol doc 23 §2).',
    '`pnpm build` debe pasar en todos.',
  ],
  'S0-DEV-01': [
    'Crear `docker-compose.yml` con Postgres 16, Redis 7, MinIO + healthchecks.',
    'Verificar: `docker compose up -d` levanta servicios.',
  ],
  'S0-DEV-02': [
    'Actualizar `.gitignore`: `.env`, `*.pfx`, `certs/`, `tmp/spikes/`, `node_modules`, `dist` (doc 23 §6).',
  ],
  'S0-DEV-03': [
    'GitHub Actions: install pnpm → lint → test → build; cache pnpm.',
    'Sin jobs SUNAT; CI verde en PR vacío de negocio.',
  ],
  'S0-DEV-04': [
    'README desarrollo: cómo levantar compose + api; link a docs 23/24/32.',
    'Onboarding corto para un nuevo clone.',
  ],
};

/** Sprint-level default how-to when no per-id map exists */
export function defaultHowTo(sprintN, task) {
  if (sprintN === 0) {
    return [
      `Implementar: **${task.summary}** según ${docMdLink('docs/planificacion/23-monorepo-bootstrap.md')}.`,
      'No añadir lógica SUNAT (firma/UBL/SOAP) en S0.',
      `Cumplir DoD de la fila y meta del sprint S0.`,
    ];
  }
  if (sprintN === 1 || sprintN === 2 || sprintN === 7) {
    return [
      `Implementar: **${task.summary}** según ${docMdLink('docs/planificacion/24-plan-spikes-emision.md')}.`,
      'Seguir DoD de la fila; dejar evidencias en `tmp/spikes/` si aplica.',
    ];
  }
  if (sprintN >= 10) {
    return [
      `Implementar UI: **${task.summary}** según ${docMdLink('docs/planificacion/33-console-ui-y-rbac.md')}.`,
      'Respetar permisos RBAC y campos P-* de la descripción.',
    ];
  }
  return [
    `Implementar: **${task.summary}** según ${docMdLink('docs/planificacion/32-backlog-sprints-mvp.md')} y refs de la issue.`,
    'Cumplir DoD de la fila y meta del sprint.',
  ];
}

export function howToForTask(task, sprintN) {
  const mapped = HOWTO_BY_ID[task.id];
  const steps = mapped && mapped.length ? mapped : defaultHowTo(sprintN, task);
  return steps.map((s) => linkifyDocsInText(s));
}
