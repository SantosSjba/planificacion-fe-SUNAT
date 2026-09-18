/** Public planning docs repo (FACTOSYS). */
export const DOCS_REPO_TREE = 'https://github.com/SantosSjba/planificacion-fe-SUNAT/tree/main';
export const DOCS_REPO_BLOB = 'https://github.com/SantosSjba/planificacion-fe-SUNAT/blob/main';

/**
 * Normalize a docs path or relative link to a GitHub blob/tree URL.
 * @param {string} ref
 * @returns {string} absolute URL
 */
export function toGitHubDocUrl(ref) {
  if (!ref) return DOCS_REPO_TREE;
  let p = String(ref).trim();
  if (/^https?:\/\//i.test(p)) {
    // Already absolute; rewrite local-looking github paths if needed
    return p;
  }
  p = p.replace(/^\.\//, '').replace(/^\.\.\//, '');
  // Bare "32" or "docs/planificacion/32" → full filename when known shorthand
  if (/^docs\/planificacion\/\d+$/.test(p)) {
    // leave as folder-ish; prefer tree
    return `${DOCS_REPO_TREE}/${p}`;
  }
  if (!p.includes('/') && /^\d+/.test(p)) {
    p = `docs/planificacion/${p}`;
  }
  if (p.startsWith('artifacts/')) {
    p = `docs/planificacion/${p}`;
  }
  const isDir = !/\.[a-z0-9]+$/i.test(p.split('/').pop() || '');
  const base = isDir ? DOCS_REPO_TREE : DOCS_REPO_BLOB;
  return `${base}/${p.replace(/^\/+/, '')}`;
}

/** Markdown link: [label](url) */
export function docMdLink(ref, label) {
  const url = toGitHubDocUrl(ref);
  const text = label || String(ref).replace(/^\.\//, '');
  return `[${text}](${url})`;
}

/** Replace bare docs/… paths in prose with markdown links (best-effort). */
export function linkifyDocsInText(text) {
  if (!text) return text;
  return String(text).replace(
    /(?<!\]\()((?:docs\/planificacion\/|artifacts\/)[a-zA-Z0-9_./\-]+\.md)/g,
    (m) => docMdLink(m, m),
  );
}
