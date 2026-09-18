/**
 * Parse docs/planificacion/32-backlog-sprints-mvp.md (+ enrich from 33)
 * into scripts/youtrack/data/backlog-s{n}.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { howToForTask } from './lib/howto.mjs';
import { docMdLink, DOCS_REPO_TREE, linkifyDocsInText } from './lib/github-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DOC32 = path.join(ROOT, 'docs/planificacion/32-backlog-sprints-mvp.md');
const DOC33 = path.join(ROOT, 'docs/planificacion/33-console-ui-y-rbac.md');
const OUT_DIR = path.join(__dirname, 'data');

export const SPRINT_DEFS = [
  { n: 0, name: 'S0-scaffold', title: 'Scaffolding monorepo + NestJS + Docker', goal: '`pnpm build/lint/test` verdes; `GET /health`; Compose local; cero lógica SUNAT.' },
  { n: 1, name: 'S1-sign-ubl', title: 'Spike A firma + Spike B Invoice UBL', goal: 'golden unsigned pasa XSD; firma verify; ADR-002 cerrado.' },
  { n: 2, name: 'S2-sendbill', title: 'Spike C SendBill + Excel P0 + XSL nightly', goal: 'SendBill (fake/beta) + Excel P0 + XSL nightly.' },
  { n: 3, name: 'S3-platform', title: 'DB, tenancy, credenciales, colas', goal: 'DB Drizzle, tenancy, RBAC, credenciales, BullMQ.' },
  { n: 4, name: 'S4-invoice-api', title: 'API emisión Factura 01', goal: 'POST invoices E2E con pipeline emisión.' },
  { n: 5, name: 'S5-boleta-notas', title: 'Boleta + NC + ND', goal: 'Boleta + NC + ND por API.' },
  { n: 6, name: 'S6-ra-rc', title: 'RA + RC', goal: 'RA + RC async con poll.' },
  { n: 7, name: 'S7-gre', title: 'GRE', goal: 'GRE REST (09/31) con OAuth + tickets.' },
  { n: 8, name: 'S8-notify-pdf-valid', title: 'Webhooks + PDF + validez', goal: 'Webhooks + PDF RI + consulta validez.' },
  { n: 9, name: 'S9-api-mvp', title: 'Hardening DX / SDK (DoD API MVP)', goal: 'DoD API MVP + SDK mínimo.' },
  { n: 10, name: 'S10-console-auth', title: 'Consola: shell, auth, RBAC UI, empresas', goal: 'login + gestión usuarios/roles + onboarding company.' },
  { n: 11, name: 'S11-console-ops', title: 'Consola: documentos, GRE, desarrolladores', goal: 'Console docs/GRE/devs + DoD producto.' },
];

function inferType(id, epic) {
  const s = `${id} ${epic}`.toUpperCase();
  if (/SIGN|UBL|GATE|SOAP|VAL|SPIKE|GRE-0[12]|S1-|S2-/.test(s) && /SIGN|UBL|GATE|SOAP|VAL|SPIKE/.test(s)) {
    if (/SIGN|UBL|GATE|SOAP|VAL|SPIKE/.test(s)) return /SIGN|SOAP|GRE|UBL|GATE|VAL/.test(s) ? 'spike' : 'spike';
  }
  if (/TOOL|DEV|INFRA|PKG|COMPOSE|CI|DOCKER/.test(s) || /S0-TOOL|S0-DEV|S0-PKG/.test(s)) return 'infra';
  if (/S0-API|EMIT|API|AUTH-0[123]|S3-AUTH-0[123]|S4-|S5-|S6-|S9-/.test(s)) return 'api';
  if (/WORKER|POLL|QUEUE|BULL/.test(s) || /S3-INFRA|S4-EMIT-03|S6-02|S8-0[25]/.test(s)) return 'worker';
  if (/APP|RBAC|EMP|DOC|S10-|S11-|CONSOLE|P-/.test(s)) return 'console';
  if (/DX|SDK|S9-03|TELEMETRY/.test(s)) return 'dx';
  if (/SUNAT|SOAP|SIGN|UBL|GRE|CDR|XSD|XSL/.test(s)) return 'sunat';
  if (/S0-API/.test(s)) return 'infra';
  if (/S3-DB|S3-COMP|S3-AUTH|S3-INFRA/.test(s)) return 'api';
  if (/S7-/.test(s)) return 'sunat';
  if (/S8-/.test(s)) return 'api';
  return 'api';
}

function refineType(id, epicTitle) {
  const idU = id.toUpperCase();
  if (idU.startsWith('S0-TOOL') || idU.startsWith('S0-DEV') || idU.startsWith('S0-PKG')) return 'infra';
  if (idU.startsWith('S0-API')) return 'infra';
  if (idU.startsWith('S1-') || idU.startsWith('S2-')) return 'spike';
  if (idU.startsWith('S10-') || idU.startsWith('S11-')) return 'console';
  if (idU.startsWith('S9-03') || idU.startsWith('S9-04')) return 'dx';
  if (idU.startsWith('S7-')) return 'sunat';
  if (idU.includes('WORKER') || /-0[23]$/.test(idU) && /S4-EMIT-03|S6-02|S8-02|S8-05/.test(idU)) return 'worker';
  if (idU.startsWith('S4-EMIT-03') || idU === 'S6-02' || idU === 'S8-02' || idU === 'S8-05') return 'worker';
  if (/AUTH|EMIT|COMP|DB|INFRA|API/.test(epicTitle.toUpperCase()) || idU.startsWith('S3-') || idU.startsWith('S4-') || idU.startsWith('S5-') || idU.startsWith('S6-') || idU.startsWith('S8-') || idU.startsWith('S9-')) {
    return 'api';
  }
  return inferType(id, epicTitle);
}

function splitSubtasks(cell) {
  if (!cell || !String(cell).trim()) return [];
  return String(cell)
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitDod(cell) {
  if (!cell || !String(cell).trim()) return [];
  return String(cell)
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractLinks(text) {
  const refs = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    refs.push(m[2].startsWith('http') ? m[2] : m[2].replace(/^\.\.\//, 'docs/planificacion/'));
  }
  const pathRe = /(?:docs\/planificacion\/|artifacts\/)[a-zA-Z0-9_./\-]+/g;
  let p;
  while ((p = pathRe.exec(text))) {
    if (!refs.includes(p[0])) refs.push(p[0]);
  }
  return [...new Set(refs)];
}

function parseTableRows(block) {
  const lines = block.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    if (i === 0) continue; // header
    if (cells.every((c) => /^[-:]+$/.test(c))) continue; // separator
    if (cells.length < 2) continue;
    const id = cells[0];
    if (!/^S\d+-/.test(id)) continue;
    rows.push({
      id,
      summary: cells[1] || '',
      subtasksRaw: cells[2] || '',
      dodRaw: cells[3] || '',
      estimate: (cells[4] || 'M').replace(/[^SML]/gi, '') || 'M',
    });
  }
  return rows;
}

function parseScreens(doc33) {
  const screens = {};
  const parts = doc33.split(/^### (P-[^\n]+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const body = parts[i + 1] || '';
    const cut = body.search(/\n### /);
    const content = (cut >= 0 ? body.slice(0, cut) : body).trim();
    // Drop parenthetical notes; split aliases on " / "
    const cleaned = heading.replace(/\([^)]*\)/g, '').trim();
    const ids = cleaned
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter((s) => /^P-[A-Z0-9-]+$/i.test(s));
    for (const id of ids) {
      screens[id] = content;
      if (id.endsWith('-OVERVIEW')) {
        screens[id.replace(/-OVERVIEW$/, '')] = content;
      }
    }
    if (/FORM\s*\/\s*DETAIL/i.test(cleaned)) {
      const base = cleaned.match(/(P-[A-Z0-9-]+)-FORM/i);
      if (base) screens[`${base[1]}-DETAIL`] = content;
    }
  }
  return screens;
}

function rbacSummary(doc33) {
  const m = doc33.match(/## 1\. Modelo RBAC([\s\S]*?)(?=\n## 2\.)/);
  return m ? m[1].trim() : '';
}

function findScreenIds(text) {
  const ids = [];
  // Letter after P- (P-LOGIN); allow trailing slash forms; trim dangling -
  const re = /§?(P-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)/g;
  let m;
  while ((m = re.exec(text))) {
    ids.push(m[1].replace(/-+$/, ''));
  }
  return [...new Set(ids)];
}

function findPermission(text) {
  const m = text.match(/`([a-z*]+:[a-z*|]+)`/);
  return m ? m[1] : null;
}

function stripTicks(s) {
  return String(s).replace(/`/g, '').trim();
}

function buildChildTasks(task, sprintDef, howToSteps) {
  const items = task.subtasks.length
    ? task.subtasks
    : [`Implementar objetivo + cumplir DoD: ${task.summary}`];
  const fuente = [
    docMdLink('docs/planificacion/32-backlog-sprints-mvp.md', '32-backlog-sprints-mvp.md'),
    docMdLink('docs/planificacion/23-monorepo-bootstrap.md', '23'),
    docMdLink('docs/planificacion/24-plan-spikes-emision.md', '24'),
    docMdLink('docs/planificacion/33-console-ui-y-rbac.md', '33'),
  ].join(' · ');
  return items.map((text, i) => {
    const n = i + 1;
    const key = `${task.id}.${n}`;
    const summary = stripTicks(text).slice(0, 120);
    const descriptionMarkdown = [
      `## Subtarea de \`${task.id}\``,
      '',
      `- **Padre:** ${task.id} — ${task.summary}`,
      `- **Sprint:** S${sprintDef.n} (\`${sprintDef.name}\`)`,
      `- **Epic:** ${task.epic}`,
      '',
      '## Qué hacer',
      text,
      '',
      '## Contexto del padre (Cómo hacerlo)',
      ...howToSteps.map((s, idx) => `${idx + 1}. ${linkifyDocsInText(s)}`),
      '',
      '## DoD del padre',
      ...(task.dod.length ? task.dod.map((d) => `- ${d}`) : ['- Ver DoD del padre']),
      `- Meta sprint: ${sprintDef.goal}`,
      '',
      '## Notas',
      '- Tag `type:subtask`; asignar esta issue o el padre completo.',
      `- Fuente: ${fuente}`,
      `- Repo docs: [${DOCS_REPO_TREE}](${DOCS_REPO_TREE})`,
    ].join('\n');
    return { key, summary, descriptionMarkdown };
  });
}

/**
 * Build parent description. childLinks: [{ idReadable, summary }] after import.
 */
export function buildDescription(task, sprintDef, epicId, epicTitle, opts = {}) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : splitSubtasks(task.subtasksRaw);
  const dod = Array.isArray(task.dod) ? task.dod : splitDod(task.dodRaw);
  const howTo = opts.howToSteps || task.howToMarkdown || [];
  const lines = [];
  lines.push('## Backlog');
  lines.push(`- **ID:** ${task.id}`);
  lines.push(`- **Sprint:** S${sprintDef.n} — ${sprintDef.title} (\`${sprintDef.name}\`)`);
  lines.push(`- **Epic:** ${epicId} — ${epicTitle}`);
  lines.push(`- **Estimación:** ${task.estimate}`);
  lines.push(`- **Type:** ${task.type}`);
  lines.push('');
  lines.push('## Objetivo');
  lines.push(task.summary);
  lines.push('');
  lines.push('## Cómo hacerlo');
  if (howTo.length) howTo.forEach((s, i) => lines.push(`${i + 1}. ${linkifyDocsInText(s)}`));
  else lines.push('1. Ver referencias y DoD.');
  lines.push('');
  lines.push('## Subtareas (issues)');
  if (opts.childLinks?.length) {
    opts.childLinks.forEach((c) => {
      lines.push(`- [ ] ${c.idReadable} — ${c.summary}`);
    });
  } else if (task.childTasks?.length) {
    task.childTasks.forEach((c) => lines.push(`- [ ] \`${c.key}\` — ${c.summary}`));
  } else if (subtasks.length) {
    subtasks.forEach((s) => lines.push(`- ${s}`));
  } else {
    lines.push('- (se creará 1 subtarea mínima al importar)');
  }
  lines.push('');
  lines.push('## Definition of Done');
  if (dod.length) dod.forEach((d) => lines.push(`- ${d}`));
  else lines.push('- (DoD vacío en fila; aplicar DoD del sprint)');
  lines.push(`- [ ] Cumple DoD del sprint: ${sprintDef.goal}`);
  lines.push('');
  lines.push('## Verificar');
  dod.forEach((d) => lines.push(`- [ ] ${d}`));
  lines.push(`- [ ] Meta sprint: ${sprintDef.goal}`);
  if (sprintDef.n === 0) {
    lines.push('- [ ] `pnpm build` / `pnpm test` / `pnpm lint` no rompen por este cambio');
  }
  lines.push('');
  lines.push('## Referencias');
  const refs = [...(task.refs || [])];
  if (opts.extraRefs) refs.push(...opts.extraRefs);
  if (refs.length) {
    [...new Set(refs)].forEach((r) => {
      if (/^https?:\/\//i.test(r) && r.includes('github.com')) {
        lines.push(`- [${r.replace(/^https:\/\/github.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[^/]+\//, '')}](${r})`);
      } else if (/^https?:\/\//i.test(r)) {
        lines.push(`- ${r}`);
      } else {
        lines.push(`- ${docMdLink(r)}`);
      }
    });
  } else {
    lines.push(`- ${docMdLink('docs/planificacion/32-backlog-sprints-mvp.md')}`);
  }
  lines.push(`- Repo: [${DOCS_REPO_TREE}](${DOCS_REPO_TREE})`);
  lines.push('');
  if (opts.consoleBlock) {
    lines.push('## Consola / RBAC');
    lines.push(opts.consoleBlock);
    lines.push('');
  }
  if (opts.rbacBlock) {
    lines.push('## RBAC (resumen doc 33 §1)');
    lines.push(opts.rbacBlock);
    lines.push('');
  }
  lines.push('## Notas de importación');
  lines.push(
    `- Fuente: ${docMdLink('docs/planificacion/32-backlog-sprints-mvp.md', '32')} · ${docMdLink('docs/planificacion/33-console-ui-y-rbac.md', '33')} · ${docMdLink('docs/planificacion/23-monorepo-bootstrap.md', '23')} · ${docMdLink('docs/planificacion/24-plan-spikes-emision.md', '24')}`,
  );
  lines.push(`- Docs en GitHub: [${DOCS_REPO_TREE}](${DOCS_REPO_TREE})`);
  lines.push('- Asignar **hijas** para trabajo fino o el **padre** si una persona hace todo.');
  lines.push('- Importado vía API REST FACTOSYS');
  return lines.join('\n');
}

export function parseBacklog() {
  const md = fs.readFileSync(DOC32, 'utf8').replace(/\r\n/g, '\n');
  const doc33 = fs.existsSync(DOC33) ? fs.readFileSync(DOC33, 'utf8').replace(/\r\n/g, '\n') : '';
  const screens = parseScreens(doc33);
  const rbac = rbacSummary(doc33);

  // Override metas from doc when present
  const sprintDefs = SPRINT_DEFS.map((d) => ({ ...d }));
  for (const d of sprintDefs) {
    const re = new RegExp(`## Sprint ${d.n}[^\\n]*\\n+(?:###[^\\n]*\\n+)*\\*\\*Meta:\\*\\*\\s*(.+)`, 'm');
    const m = md.match(re);
    if (m) d.goal = m[1].trim();
  }

  const bySprint = Object.fromEntries(sprintDefs.map((d) => [d.n, { sprint: d, epics: [], tasks: [] }]));

  const sprintSections = md.split(/^## Sprint (\d+)/m);
  for (let i = 1; i < sprintSections.length; i += 2) {
    const n = Number(sprintSections[i]);
    const body = sprintSections[i + 1] || '';
    if (!bySprint[n]) continue;

    // default epic for tables without ### Epic
    let currentEpic = { id: `S${n}`, title: `Sprint ${n}` };
    // IDs like S0-TOOL; title after em/en dash only (ASCII hyphen stays in ID)
    const epicChunks = body.split(/^### Epic (S\d+(?:-[A-Z0-9]+)+)(?:\s*[—–]\s*(.+))?\s*$/m);

    const processChunk = (epicId, epicTitle, chunk) => {
      const rows = parseTableRows(chunk);
      for (const row of rows) {
        const type = refineType(row.id, epicTitle);
        const rowText = `${row.summary} ${row.subtasksRaw} ${row.dodRaw}`;
        const refs = extractLinks(`${rowText} ${chunk.slice(0, 200)}`);
        const screenIds = findScreenIds(rowText);
        const permission = findPermission(rowText);
        let screenFieldsMarkdown = null;
        let consoleBlock = null;
        if (screenIds.length || type === 'console' || n >= 10) {
          const parts = [];
          if (permission) parts.push(`- **Permiso:** \`${permission}\``);
          if (screenIds.length) {
            parts.push(`- **Pantalla(s):** ${screenIds.map((s) => `\`${s}\``).join(', ')}`);
            const fieldBlocks = [];
            for (const sid of screenIds) {
              const key = sid.split('/')[0];
              const content = screens[sid] || screens[key];
              if (content) {
                fieldBlocks.push(`### ${sid}\n${content.trim()}`);
              }
            }
            if (fieldBlocks.length) {
              screenFieldsMarkdown = fieldBlocks.join('\n\n');
              parts.push('- **Campos (doc 33):**');
              parts.push(screenFieldsMarkdown);
            }
          }
          if (parts.length) consoleBlock = parts.join('\n');
        }

        let rbacBlock = null;
        if (/S3-AUTH-0[4-8]|S10-RBAC|RBAC/i.test(row.id + epicTitle + row.summary) && rbac) {
          rbacBlock = rbac.slice(0, 2500);
        }

        const task = {
          id: row.id,
          sprint: `S${n}`,
          sprintName: bySprint[n].sprint.name,
          epic: epicId,
          epicTitle,
          summary: row.summary,
          estimate: row.estimate,
          type,
          subtasks: splitSubtasks(row.subtasksRaw),
          dod: splitDod(row.dodRaw),
          refs,
          permission,
          screenId: screenIds[0] || null,
          screenFieldsMarkdown,
          howToMarkdown: [],
          childTasks: [],
          descriptionMarkdown: '',
        };

        const extraRefs = [];
        if (n === 0) {
          extraRefs.push('docs/planificacion/23-monorepo-bootstrap.md', 'docs/planificacion/06-stack-tecnologico.md');
        }
        if (n === 1 || n === 2 || n === 7) {
          extraRefs.push('docs/planificacion/24-plan-spikes-emision.md');
        }
        if (n >= 10) {
          extraRefs.push('docs/planificacion/33-console-ui-y-rbac.md');
        }

        task.howToMarkdown = howToForTask(task, n);
        task.childTasks = buildChildTasks(task, bySprint[n].sprint, task.howToMarkdown);
        task.descriptionMarkdown = buildDescription(task, bySprint[n].sprint, epicId, epicTitle, {
          extraRefs,
          consoleBlock,
          rbacBlock,
          howToSteps: task.howToMarkdown,
        });
        task._extraRefs = extraRefs;
        task._consoleBlock = consoleBlock;
        task._rbacBlock = rbacBlock;

        bySprint[n].tasks.push(task);
        if (!bySprint[n].epics.find((e) => e.id === epicId)) {
          bySprint[n].epics.push({ id: epicId, title: epicTitle, childIds: [] });
        }
        bySprint[n].epics.find((e) => e.id === epicId).childIds.push(row.id);
      }
    };

    if (epicChunks.length === 1) {
      processChunk(currentEpic.id, currentEpic.title, body);
    } else {
      // [pre, id, title, content, id, title, content, ...]
      if (epicChunks[0]?.trim()) {
        processChunk(currentEpic.id, currentEpic.title, epicChunks[0]);
      }
      for (let j = 1; j < epicChunks.length; j += 3) {
        const epicId = (epicChunks[j] || '').trim();
        const epicTitle = (epicChunks[j + 1] || epicId).trim();
        const chunk = epicChunks[j + 2] || '';
        if (!epicId) continue;
        processChunk(epicId, epicTitle, chunk);
      }
    }
  }

  return { sprintDefs, bySprint, screens, rbac };
}

export function writeBacklogJson() {
  const { bySprint, sprintDefs } = parseBacklog();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  for (const d of sprintDefs) {
    const pack = bySprint[d.n];
    const tasks = pack.tasks;
    for (const t of tasks) {
      if (!t.descriptionMarkdown || t.descriptionMarkdown.length < 80) {
        throw new Error(`Empty/short description for ${t.id}`);
      }
      if (!t.childTasks?.length) {
        throw new Error(`No childTasks for ${t.id}`);
      }
      if (!t.howToMarkdown?.length) {
        throw new Error(`No howToMarkdown for ${t.id}`);
      }
      if ((d.n >= 10 || t.type === 'console') && t.screenId && !t.screenFieldsMarkdown) {
        console.warn(`WARN: ${t.id} has screen ${t.screenId} but no fields from doc 33`);
      }
    }
    const file = path.join(OUT_DIR, `backlog-s${d.n}.json`);
    const payload = {
      sprint: d,
      epics: pack.epics,
      tasks,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    summary.push({ sprint: d.n, file, tasks: tasks.length, epics: pack.epics.length });
  }
  return summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const summary = writeBacklogJson();
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
