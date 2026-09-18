/**
 * YouTrack REST: setup + import backlog with developer-ready parent/child issues.
 *
 * Usage:
 *   node scripts/youtrack/import-backlog.mjs setup
 *   node scripts/youtrack/import-backlog.mjs build
 *   node scripts/youtrack/import-backlog.mjs import --sprint S0 [--dry-run] [--no-subtasks]
 *   node scripts/youtrack/import-backlog.mjs enrich-s0 [--dry-run]
 *   node scripts/youtrack/import-backlog.mjs all-s0 [--dry-run]
 *
 * Env: YOUTRACK_URL, YOUTRACK_TOKEN (optional; falls back to ~/.cursor/mcp.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadYouTrackConfig, apiHeaders } from './lib/config.mjs';
import { writeBacklogJson, SPRINT_DEFS, parseBacklog, buildDescription } from './build-backlog.mjs';
import { docMdLink, DOCS_REPO_TREE } from './lib/github-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const TMP_IDS = path.join(__dirname, '../../tmp/youtrack-ids.json');
const AGILE_PREFERRED = 'Desarrollo del proyecto FACTURACION ELECTRONICA';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function yt(cfg, method, apiPath, body) {
  const url = `${cfg.url}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const res = await fetch(url, {
    method,
    headers: apiHeaders(cfg.token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${apiPath} → ${res.status}: ${typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data).slice(0, 400)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function loadIds() {
  if (fs.existsSync(TMP_IDS)) {
    return JSON.parse(fs.readFileSync(TMP_IDS, 'utf8'));
  }
  return { tags: {}, sprints: {}, agileId: null, projectId: '0-0' };
}

function saveIds(ids) {
  fs.mkdirSync(path.dirname(TMP_IDS), { recursive: true });
  fs.writeFileSync(TMP_IDS, JSON.stringify(ids, null, 2), 'utf8');
}

async function listAllTags(cfg) {
  const out = [];
  let skip = 0;
  const top = 100;
  for (;;) {
    const batch = await yt(cfg, 'GET', `/api/tags?fields=id,name&$top=${top}&$skip=${skip}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < top) break;
    skip += top;
  }
  return out;
}

async function ensureTag(cfg, ids, name) {
  if (ids.tags[name]) return ids.tags[name];
  const existing = (await listAllTags(cfg)).find((t) => t.name === name);
  if (existing) {
    ids.tags[name] = existing.id;
    return existing.id;
  }
  const created = await yt(cfg, 'POST', '/api/tags?fields=id,name', { name });
  ids.tags[name] = created.id;
  console.log(`  tag created: ${name} (${created.id})`);
  return created.id;
}

async function setup(cfg) {
  console.log('Fase 0 — setup YouTrack');
  const projects = await yt(cfg, 'GET', '/api/admin/projects?fields=id,shortName,name');
  const fe = (projects || []).find((p) => p.shortName === 'FE' || p.id === cfg.projectId);
  if (!fe) throw new Error('Project FE not found');
  console.log(`  project FE id=${fe.id}`);

  const ids = loadIds();
  ids.projectId = fe.id;

  const typeTags = [
    'type:infra', 'type:spike', 'type:api', 'type:worker',
    'type:console', 'type:dx', 'type:sunat', 'type:subtask',
  ];
  const sprintTags = Array.from({ length: 12 }, (_, i) => `sprint:S${i}`);
  const sizeTags = ['size:S', 'size:M', 'size:L'];

  const { bySprint } = parseBacklog();
  const epicTags = new Set();
  for (const n of Object.keys(bySprint)) {
    for (const e of bySprint[n].epics) {
      epicTags.add(`epic:${e.id}`);
    }
  }

  console.log('  ensuring tags…');
  for (const name of [...typeTags, ...sprintTags, ...sizeTags, ...epicTags]) {
    await ensureTag(cfg, ids, name);
    await sleep(40);
  }

  const agiles = await yt(cfg, 'GET', '/api/agiles?fields=id,name,projects(id,shortName),sprints(id,name,goal)');
  let agile = (agiles || []).find((a) => a.name === AGILE_PREFERRED)
    || (agiles || []).find((a) => (a.projects || []).some((p) => p.shortName === 'FE'));
  if (!agile) throw new Error('No agile board for FE');
  ids.agileId = agile.id;
  console.log(`  agile: ${agile.name} (${agile.id})`);

  agile = await yt(cfg, 'GET', `/api/agiles/${agile.id}?fields=id,name,sprints(id,name,goal)`);
  const existing = Object.fromEntries((agile.sprints || []).map((s) => [s.name, s]));

  console.log('  ensuring sprints…');
  for (const d of SPRINT_DEFS) {
    if (existing[d.name]) {
      ids.sprints[d.name] = existing[d.name].id;
      console.log(`  sprint exists: ${d.name} (${existing[d.name].id})`);
    } else {
      const created = await yt(cfg, 'POST', `/api/agiles/${agile.id}/sprints?fields=id,name,goal`, {
        name: d.name,
        goal: d.goal,
      });
      ids.sprints[d.name] = created.id;
      console.log(`  sprint created: ${d.name} (${created.id})`);
      await sleep(80);
    }
  }

  saveIds(ids);
  console.log(`  wrote ${TMP_IDS}`);
  return ids;
}

async function findIssueBySummary(cfg, summary) {
  const safe = summary.replace(/"/g, '\\"');
  const query = encodeURIComponent(`project: FE Summary: "${safe}"`);
  try {
    const issues = await yt(cfg, 'GET', `/api/issues?query=${query}&fields=id,idReadable,summary&$top=10`);
    if (Array.isArray(issues)) {
      return issues.find((i) => i.summary === summary) || null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function addTagsToIssue(cfg, issueId, tagIds) {
  for (const tagId of tagIds) {
    try {
      await yt(cfg, 'POST', `/api/issues/${issueId}/tags?fields=id,name`, { id: tagId });
    } catch (e) {
      if (e.status !== 400) console.warn(`  tag link warn ${tagId}: ${e.message}`);
    }
    await sleep(25);
  }
}

async function addIssueToSprint(cfg, ids, sprintName, issueId) {
  const sprintId = ids.sprints[sprintName];
  if (!sprintId || !ids.agileId) return;
  try {
    const sprint = await yt(
      cfg,
      'GET',
      `/api/agiles/${ids.agileId}/sprints/${sprintId}?fields=id,name,issues(id)`,
    );
    const current = (sprint.issues || []).map((i) => ({ id: i.id }));
    if (current.some((i) => i.id === issueId)) return;
    await yt(cfg, 'POST', `/api/agiles/${ids.agileId}/sprints/${sprintId}?fields=id,name`, {
      issues: [...current, { id: issueId }],
    });
  } catch (e) {
    try {
      await yt(cfg, 'POST', `/api/commands`, {
        query: `add Sprints ${sprintName}`,
        issues: [{ id: issueId }],
      });
    } catch (e2) {
      console.warn(`  sprint assign warn ${sprintName}: ${e.message} / ${e2.message}`);
    }
  }
}

async function linkSubtaskOf(cfg, childIssueId, parentIssueId, parentReadable) {
  try {
    await yt(cfg, 'POST', `/api/issues/${childIssueId}/links/subtask of?fields=id`, {
      issues: [{ id: parentIssueId }],
    });
    return;
  } catch {
    // try command with readable id
  }
  try {
    await yt(cfg, 'POST', `/api/commands`, {
      query: `subtask of ${parentReadable || parentIssueId}`,
      issues: [{ id: childIssueId }],
    });
  } catch (e) {
    console.warn(`  link subtask warn: ${e.message}`);
  }
}

async function upsertIssue(cfg, ids, {
  summary,
  description,
  tagNames,
  sprintName,
  dryRun,
}) {
  const tagIds = [];
  for (const n of tagNames) {
    if (!ids.tags[n]) await ensureTag(cfg, ids, n);
    tagIds.push(ids.tags[n]);
  }

  if (dryRun) {
    console.log(`  DRY-RUN ${summary} (${(description || '').length} chars)`);
    return { id: 'dry', idReadable: 'DRY', summary, dryRun: true };
  }

  const existing = await findIssueBySummary(cfg, summary);
  let issue;
  if (existing) {
    issue = existing;
    await yt(cfg, 'POST', `/api/issues/${existing.id}?fields=id,idReadable,summary`, {
      description,
    });
    console.log(`  updated ${existing.idReadable} ← ${summary.slice(0, 60)}`);
  } else {
    issue = await yt(cfg, 'POST', '/api/issues?fields=id,idReadable,summary', {
      project: { id: ids.projectId },
      summary,
      description,
    });
    console.log(`  created ${issue.idReadable} ← ${summary.slice(0, 60)}`);
  }

  await addTagsToIssue(cfg, issue.id, tagIds);
  if (sprintName) await addIssueToSprint(cfg, ids, sprintName, issue.id);
  return issue;
}

async function importSprint(cfg, sprintKey, { dryRun, withSubtasks }) {
  const n = Number(String(sprintKey).replace(/^S/i, ''));
  writeBacklogJson();
  const file = path.join(DATA_DIR, `backlog-s${n}.json`);
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ids = loadIds();
  if (!ids.agileId || !Object.keys(ids.tags).length) {
    if (!dryRun) ids = await setup(cfg);
  } else if (!ids.tags['type:subtask'] && !dryRun) {
    await ensureTag(cfg, ids, 'type:subtask');
  }

  console.log(`Import S${n}: ${pack.tasks.length} tasks, ${pack.epics.length} epics, subtasks=${withSubtasks}`);
  const epicIssueIds = {};
  const epicReadable = {};
  const log = [];

  for (const epic of pack.epics) {
    const summary = `[EPIC ${epic.id}] ${epic.title}`;
    const description = [
      `## Epic ${epic.id}`,
      '',
      epic.title,
      '',
      '## Hijos (backlog)',
      ...epic.childIds.map((id) => `- ${id}`),
      '',
      '## Sprint',
      `- ${pack.sprint.name}: ${pack.sprint.goal}`,
      '',
      '## Cómo usar',
      '- Asignar issues padre (`[S0-…]`) o sus subtareas hijas (`[S0-….N]`).',
      '',
      '## Notas',
      `- Fuente: ${docMdLink('docs/planificacion/32-backlog-sprints-mvp.md', '32-backlog-sprints-mvp.md')}`,
      `- Repo docs: [${DOCS_REPO_TREE}](${DOCS_REPO_TREE})`,
    ].join('\n');

    const issue = await upsertIssue(cfg, ids, {
      summary,
      description,
      tagNames: [
        `sprint:S${pack.sprint.n}`,
        'size:L',
        `type:${pack.tasks.find((t) => t.epic === epic.id)?.type || 'api'}`,
        `epic:${epic.id}`,
      ],
      sprintName: pack.sprint.name,
      dryRun,
    });
    if (!dryRun) {
      epicIssueIds[epic.id] = issue.id;
      epicReadable[epic.id] = issue.idReadable;
    }
    log.push({ backlogId: `EPIC-${epic.id}`, youtrack: issue.idReadable, kind: 'epic' });
    await sleep(60);
  }

  for (const task of pack.tasks) {
    const parentSummary = `[${task.id}] ${task.summary}`;
    // First upsert parent with placeholder child list
    let parentDesc = task.descriptionMarkdown;
    let parent = await upsertIssue(cfg, ids, {
      summary: parentSummary,
      description: parentDesc,
      tagNames: [
        `sprint:${task.sprint}`,
        `size:${task.estimate}`,
        `type:${task.type}`,
        `epic:${task.epic}`,
      ],
      sprintName: task.sprintName,
      dryRun,
    });

    if (!dryRun && epicIssueIds[task.epic]) {
      await linkSubtaskOf(cfg, parent.id, epicIssueIds[task.epic], epicReadable[task.epic]);
    }

    log.push({ backlogId: task.id, youtrack: parent.idReadable, kind: 'parent' });
    const childLinks = [];

    if (withSubtasks) {
      for (const child of task.childTasks || []) {
        const childSummary = `[${child.key}] ${child.summary}`;
        const childIssue = await upsertIssue(cfg, ids, {
          summary: childSummary,
          description: child.descriptionMarkdown,
          tagNames: [
            `sprint:${task.sprint}`,
            `size:S`,
            'type:subtask',
            `epic:${task.epic}`,
          ],
          sprintName: task.sprintName,
          dryRun,
        });
        if (!dryRun) {
          await linkSubtaskOf(cfg, childIssue.id, parent.id, parent.idReadable);
          childLinks.push({
            idReadable: childIssue.idReadable,
            summary: child.summary,
            key: child.key,
          });
        } else {
          childLinks.push({ idReadable: 'DRY', summary: child.summary, key: child.key });
        }
        log.push({
          backlogId: child.key,
          youtrack: childIssue.idReadable,
          kind: 'subtask',
          parent: parent.idReadable,
        });
        await sleep(50);
      }

      // Rewrite parent description with real FE-* links
      parentDesc = buildDescription(task, pack.sprint, task.epic, task.epicTitle, {
        extraRefs: task._extraRefs || task.refs,
        consoleBlock: task._consoleBlock,
        rbacBlock: task._rbacBlock,
        howToSteps: task.howToMarkdown,
        childLinks,
      });
      if (!dryRun) {
        await yt(cfg, 'POST', `/api/issues/${parent.id}?fields=id,idReadable`, {
          description: parentDesc,
        });
        console.log(`  parent description linked ← ${parent.idReadable}`);
      }
    }

    await sleep(60);
  }

  saveIds(ids);
  const logPath = path.join(DATA_DIR, `import-log-s${n}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ when: new Date().toISOString(), dryRun, withSubtasks, log }, null, 2));
  console.log(`Log: ${logPath}`);
  return log;
}

function parseArgs(argv) {
  const args = {
    cmd: argv[2] || 'help',
    sprint: 'S0',
    dryRun: false,
    withSubtasks: true,
  };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === '--sprint') args.sprint = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--no-subtasks') args.withSubtasks = false;
    else if (argv[i] === '--with-subtasks') args.withSubtasks = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.cmd === 'help' || args.cmd === '--help') {
    console.log(`Usage:
  node scripts/youtrack/import-backlog.mjs setup
  node scripts/youtrack/import-backlog.mjs build
  node scripts/youtrack/import-backlog.mjs import --sprint S0 [--dry-run] [--no-subtasks]
  node scripts/youtrack/import-backlog.mjs enrich-s0 [--dry-run]
  node scripts/youtrack/import-backlog.mjs all-s0 [--dry-run]`);
    return;
  }

  if (args.cmd === 'build') {
    const summary = writeBacklogJson();
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
    return;
  }

  const cfg = loadYouTrackConfig();
  console.log(`YouTrack: ${cfg.url} project=${cfg.projectId}`);

  if (args.cmd === 'setup') {
    await setup(cfg);
    return;
  }

  if (args.cmd === 'import') {
    await importSprint(cfg, args.sprint, { dryRun: args.dryRun, withSubtasks: args.withSubtasks });
    return;
  }

  if (args.cmd === 'enrich-s0' || args.cmd === 'all-s0') {
    writeBacklogJson();
    if (!args.dryRun) await setup(cfg);
    await importSprint(cfg, 'S0', { dryRun: args.dryRun, withSubtasks: true });
    console.log('\nS0 enriquecido (padres + subtareas hijas). Para S1: import --sprint S1');
    return;
  }

  throw new Error(`Unknown command: ${args.cmd}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
