# YouTrack backlog import (FACTOSYS FE)

Importa el backlog de [`docs/planificacion/32-backlog-sprints-mvp.md`](https://github.com/SantosSjba/planificacion-fe-SUNAT/blob/main/docs/planificacion/32-backlog-sprints-mvp.md) (+ pantallas de `33` y pasos de `23`/`24`) al proyecto **FE** vía **API REST**.

Docs públicos: [planificacion-fe-SUNAT](https://github.com/SantosSjba/planificacion-fe-SUNAT/tree/main) — las issues YouTrack enlazan ahí (no paths locales).

Cada tarea del backlog es un **issue padre** con:

- **Cómo hacerlo** (pasos operativos)
- **DoD / Verificar**
- **Subtareas** como **issues hijas** reales (`[S0-TOOL-01.1] …`), asignables por separado

## Cómo asignar trabajo al equipo

1. Abre el sprint `S0-scaffold` (o el que toque) en el board FE.
2. **Opción A — una persona hace toda la historia:** asigna el padre (`FE-5` = `[S0-TOOL-01] …`). Las hijas quedan como checklist.
3. **Opción B — repartir:** asigna las hijas (`type:subtask`, summary `[S0-TOOL-01.1] …`). El padre se cierra cuando todas las hijas + DoD estén OK.
4. Lee en el padre la sección **Cómo hacerlo** y **Verificar**; en la hija, **Qué hacer** + contexto del padre.

Query útil: `project: FE tag: sprint:S0` o `tag: type:subtask`.

## Credenciales

```bash
set YOUTRACK_URL=https://youtrack.factosysperu.com
set YOUTRACK_TOKEN=perm:....
```

O reutilizar `~/.cursor/mcp.json` (`mcpServers.youtrack`). Nunca commits de tokens.

## Comandos

```bash
# Generar JSON enriquecido (howTo + childTasks)
node scripts/youtrack/import-backlog.mjs build

# Tags + 12 sprints
node scripts/youtrack/import-backlog.mjs setup

# Rehacer/enriquecer S0 (padres + hijas, idempotente por summary)
node scripts/youtrack/import-backlog.mjs enrich-s0

# Import otro sprint (mismo estándar)
node scripts/youtrack/import-backlog.mjs import --sprint S1

# Dry-run
node scripts/youtrack/import-backlog.mjs enrich-s0 --dry-run
node scripts/youtrack/import-backlog.mjs import --sprint S0 --no-subtasks   # solo padres
```

## Artefactos

| Path | Uso |
| --- | --- |
| `data/backlog-s0.json` … `s11.json` | Issues enriquecidos |
| `data/import-log-sN.json` | Mapa backlog ID → `FE-##` (padres + hijas) |
| `lib/howto.mjs` | Pasos “Cómo hacerlo” (S0 detallado desde doc 23) |
| `tmp/youtrack-ids.json` | Cache tag/sprint ids (gitignored) |

## Board

Agile **Desarrollo del proyecto FACTURACION ELECTRONICA**. Sprints: `S0-scaffold` … `S11-console-ops`.
