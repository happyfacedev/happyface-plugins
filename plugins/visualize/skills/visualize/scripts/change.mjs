// Change briefs: read a unified diff, check a change.json against it, and compile the screens the page shows.
// visualize (build.mjs) and visualize-interactive (serve.mjs) share this file: keep the two copies identical.
// CLI: node change.mjs <change.diff> lists every file with its counts and the line ranges of its hunks.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const HUES = ['blue', 'violet', 'orange', 'sky', 'plum', 'olive'];
const KINDS = ['fix', 'feature', 'change', 'removed', 'refactor', 'perf', 'security', 'tests', 'docs', 'chore'];
const LEVELS = ['low', 'medium', 'high'];
const NODE_STATES = ['new', 'changed', 'removed', 'context'];
const EDGE_STATES = ['new', 'removed', 'same'];
const CHECK_STATES = ['passed', 'failed', 'skipped', 'not run'];
const ROLES = ['generated', 'version', 'mechanical', 'tests', 'docs', 'config', 'other'];
const MAX = { changes: 6, code: 4, rows: 80, layers: 5, perLayer: 5, nodes: 16, edges: 24, first: 6, risks: 6, checks: 8, unchecked: 6 };

// ---------- diff ----------
// Git quotes unusual paths and escapes their bytes in octal.
function unquote(p) {
  if (!p.startsWith('"')) return p;
  const bytes = [];
  for (let i = 1; i < p.length - 1; i++) {
    if (p[i] !== '\\') { bytes.push(...Buffer.from(p[i])); continue; }
    const o = /^[0-7]{3}/.exec(p.slice(i + 1));
    if (o) { bytes.push(parseInt(o[0], 8)); i += 3; } else { const c = p[++i]; bytes.push(...Buffer.from({ n: '\n', t: '\t', '"': '"', '\\': '\\' }[c] ?? c)); }
  }
  return Buffer.from(bytes).toString('utf8');
}
const strip = (p) => unquote(p).replace(/^[ab]\//, '');

/** Every file in a unified diff, with its counts and hunks. Lines keep both numbers: o and n where they exist, po and pn as their place on each side. */
export function parseDiff(text) {
  const files = [];
  let f = null, h = null, o = 0, n = 0, left = [0, 0];
  for (const l of String(text).split('\n')) {
    if (l.startsWith('diff --git ')) {
      const rest = l.slice(11), half = (rest.length - 1) / 2, a = rest.slice(0, half), b = rest.slice(half + 1);
      const [old, path] = Number.isInteger(half) && strip(a) === strip(b) ? [strip(a), strip(b)] : (() => { const i = rest.lastIndexOf(' b/'); return [strip(rest.slice(0, i)), strip(rest.slice(i + 1))]; })();
      f = { path, old, status: 'modified', binary: false, add: 0, del: 0, hunks: [] };
      files.push(f); h = null; left = [0, 0];
      continue;
    }
    if (!f) continue;
    if (left[0] > 0 || left[1] > 0) {
      const s = l[0];
      if (s === '+') { h.lines.push({ s, t: l.slice(1), n, po: o, pn: n }); n++; f.add++; left[1]--; }
      else if (s === '-') { h.lines.push({ s, t: l.slice(1), o, po: o, pn: n }); o++; f.del++; left[0]--; }
      else if (s === ' ' || l === '') { h.lines.push({ s: ' ', t: l.slice(1), o, n, po: o, pn: n }); o++; n++; left[0]--; left[1]--; }
      continue;
    }
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(l);
    if (m) {
      h = { o: +m[1], oc: m[2] == null ? 1 : +m[2], n: +m[3], nc: m[4] == null ? 1 : +m[4], at: m[5].trim(), lines: [] };
      f.hunks.push(h); o = h.o; n = h.n; left = [h.oc, h.nc];
    } else if (l.startsWith('new file mode')) f.status = 'added';
    else if (l.startsWith('deleted file mode')) f.status = 'deleted';
    else if (l.startsWith('rename from ')) { f.old = unquote(l.slice(12)); f.status = 'renamed'; }
    else if (l.startsWith('rename to ')) f.path = unquote(l.slice(10));
    else if (l.startsWith('Binary files ') || l === 'GIT binary patch') f.binary = true;
    else if (l.startsWith('+++ ') && l.slice(4) !== '/dev/null') f.path = strip(l.slice(4));
    else if (l.startsWith('--- ') && l.slice(4) !== '/dev/null') f.old = strip(l.slice(4));
  }
  for (const x of files) if (x.status === 'modified' && x.old && x.old !== x.path) x.status = 'renamed';
  return files;
}

// ---------- matching ----------
const isGlob = (p) => /[*?]/.test(p);
const globRx = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*') + '$');
const matches = (pattern, path) => (isGlob(pattern) ? globRx(pattern).test(path) : pattern === path);
// A code reference may name a file by its path or by the end of it, if only one file ends that way.
function find(files, name) {
  const exact = files.find((f) => f.path === name || (f.status === 'deleted' && f.old === name));
  if (exact) return [exact];
  return files.filter((f) => f.path.endsWith('/' + name));
}

// ---------- slicing ----------
/** The diff lines of one file inside a range of line numbers, on the new side (default) or the old side. */
function slice(file, [a, b], side) {
  const at = side === 'old' ? 'po' : 'pn', rows = [];
  let prev = null, header = '';
  file.hunks.forEach((h, hi) => h.lines.forEach((ln, li) => {
    if (ln[at] < a || ln[at] > b) return;
    if (prev && (prev.hi !== hi || prev.li !== li - 1)) rows.push({ gap: true });
    if (!prev) header = h.at;
    rows.push({ s: ln.s, t: ln.t, o: ln.o ?? null, n: ln.n ?? null });
    prev = { hi, li };
  }));
  return { rows, header };
}
const ranges = (file, side) => file.hunks.map((h) => (side === 'old' ? `${h.o}–${h.o + Math.max(0, h.oc - 1)}` : `${h.n}–${h.n + Math.max(0, h.nc - 1)}`)).join(', ');

// ---------- links ----------
// Files and lines on GitHub: a pull request, a commit or a comparison. Anything else gets no links.
function linker(url) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(pull\/\d+|commit\/[0-9a-f]{7,40}|compare\/[^#?\s]+)/.exec(url || '');
  if (!m) return () => null;
  const base = `https://github.com/${m[1]}/${m[2]}/${m[3]}${m[3].startsWith('pull/') ? '/files' : ''}`;
  return (path, line, side) => `${base}#diff-${createHash('sha256').update(path).digest('hex')}${line ? (side === 'old' ? 'L' : 'R') + line : ''}`;
}

// ---------- checking and compiling ----------
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Check a change brief against its diff and compile the page's screens.
 * picture(at, pic) validates a built-in picture and reports into the same errors.
 * Returns { frames, brief }: frames drive the storyboard's navigation, brief holds what the change screens draw.
 */
export function compile(cfg, { diff, errors, warnings, picture }) {
  const need = (at, o, keys) => { for (const k of keys) if (!isText(o?.[k])) errors.push(`${at}: ${k} is missing`); };
  const list = (at, v, max, min = 0) => {
    if (v == null && !min) return [];
    if (!Array.isArray(v) || v.length < min) { errors.push(`${at}: needs ${min ? `${min} or more` : 'a list'}`); return []; }
    if (v.length > max) errors.push(`${at}: has ${v.length} entries (max ${max})`);
    return v.filter((x) => { const ok = x && typeof x === 'object'; if (!ok) errors.push(`${at}: entries must be objects`); return ok; });
  };
  const rich = (at, s) => { if ((String(s ?? '').split('**').length - 1) % 2) errors.push(`${at}: unclosed **`); if ((String(s ?? '').split('`').length - 1) % 2) errors.push(`${at}: unclosed backtick`); };
  const link = linker(cfg.source?.url);

  need('brief', cfg, ['title', 'ask', 'answer']);
  rich('answer', cfg.answer);
  if (words(cfg.answer) > 32) warnings.push(`answer is ${words(cfg.answer)} words (aim for 25 or fewer)`);
  if (!diff.length) errors.push('the diff has no files: pass the diff of this change with --diff');
  if (cfg.risk != null && !LEVELS.includes(cfg.risk)) errors.push(`risk must be one of ${LEVELS.join(', ')}`);
  if (cfg.source != null) need('source', cfg.source, ['label']);
  if (cfg.source?.url && !/^https:\/\//.test(cfg.source.url)) errors.push('source.url must start with https://');

  // Changes, each with its files and code.
  const ids = new Set(), owned = new Map();
  const changes = list('changes', cfg.changes, MAX.changes, 1).map((c, i) => {
    const at = `change ${i + 1}${c.id ? ` (${c.id})` : ''}`;
    need(at, c, ['id', 'key', 'kind', 'title', 'what', 'before', 'after']);
    if (ids.has(c.id)) errors.push(`${at}: id "${c.id}" is used twice`);
    ids.add(c.id);
    if (c.kind && !KINDS.includes(c.kind)) errors.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
    if (words(c.key) > 2) warnings.push(`${at}: key is over 2 words`);
    if (words(c.title) > 9) warnings.push(`${at}: title is ${words(c.title)} words (aim for 8)`);
    if (words(c.what) > 40) warnings.push(`${at}: what is ${words(c.what)} words (aim for 30)`);
    for (const k of ['before', 'after']) if (words(c[k]) > 18) warnings.push(`${at}: ${k} is ${words(c[k])} words (aim for 14)`);
    for (const k of ['title', 'what', 'why', 'before', 'after']) rich(`${at} ${k}`, c[k]);
    if (c.risk != null) { need(`${at} risk`, c.risk, ['level', 't']); if (!LEVELS.includes(c.risk?.level)) errors.push(`${at}: risk.level must be one of ${LEVELS.join(', ')}`); }
    const mine = [];
    for (const p of Array.isArray(c.files) && c.files.length ? c.files : (errors.push(`${at}: files is empty`), [])) {
      const hit = diff.filter((f) => matches(p, f.path) || (f.status === 'deleted' && matches(p, f.old)));
      if (!hit.length) errors.push(`${at}: "${p}" matches no file in the diff`);
      for (const f of hit) if (!mine.includes(f)) { mine.push(f); owned.set(f, [...(owned.get(f) || []), c.id]); }
    }
    const code = list(`${at} code`, c.code, MAX.code).map((k, j) => {
      const where = `${at} code ${j + 1}`;
      const found = isText(k.file) ? find(diff, k.file) : [];
      if (!isText(k.file)) { errors.push(`${where}: file is missing`); return null; }
      if (!found.length) { errors.push(`${where}: "${k.file}" is not in the diff`); return null; }
      if (found.length > 1) { errors.push(`${where}: "${k.file}" could be ${found.slice(0, 3).map((f) => f.path).join(' or ')}; give more of the path`); return null; }
      const file = found[0], side = k.side ?? (file.status === 'deleted' ? 'old' : 'new');
      if (!['new', 'old'].includes(side)) { errors.push(`${where}: side must be new or old`); return null; }
      const r = k.lines;
      if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isInteger) || r[0] > r[1]) { errors.push(`${where}: lines must be [first, last] line numbers`); return null; }
      const { rows, header } = slice(file, r, side);
      if (!rows.some((x) => x.s === '+' || x.s === '-')) { errors.push(`${where}: ${file.path} changes nothing in lines ${r[0]}–${r[1]} (${side} side). Its hunks cover ${ranges(file, side) || 'nothing'}.`); return null; }
      if (rows.length > MAX.rows) errors.push(`${where}: ${rows.length} lines (max ${MAX.rows}); show only the lines that carry the change`);
      else if (rows.length > 40) warnings.push(`${where}: ${rows.length} lines (aim for 40 or fewer)`);
      for (const note of list(`${where} notes`, k.notes, 6)) {
        need(`${where} note`, note, ['t']);
        rich(`${where} note`, note.t);
        const key = note.old != null ? 'o' : side === 'old' ? 'o' : 'n', num = note.old ?? note.line;
        const row = rows.find((x) => x[key] === num);
        if (!row) errors.push(`${where}: note line ${num} is not among the lines shown`);
        else row.note = row.note ? `${row.note} ${note.t}` : note.t;
      }
      if (k.note) rich(`${where} note`, k.note);
      if (!mine.includes(file)) warnings.push(`${where}: ${file.path} is not in this change's files`);
      return { file: file.path, status: file.status, add: file.add, del: file.del, side, at: header, note: k.note || null, rows, url: link(file.path, rows.find((x) => (side === 'old' ? x.o : x.n))?.[side === 'old' ? 'o' : 'n'], side) };
    }).filter(Boolean);
    if (c.pic) { if (picture) picture(`${at} pic`, c.pic); if (!isText(c.src)) warnings.push(`${at}: pic has no src (where it comes from)`); }
    return { ...c, n: i + 1, color: HUES[i], files: mine.map((f) => f.path), add: mine.reduce((s, f) => s + f.add, 0), del: mine.reduce((s, f) => s + f.del, 0), code };
  });
  const byId = new Map(changes.map((c) => [c.id, c]));
  const known = (at, id) => { if (id != null && !byId.has(id)) errors.push(`${at}: change "${id}" is not a change id`); };

  // Files in no change need a role, so every file is accounted for.
  const others = list('others', cfg.others, 50);
  for (const [i, x] of others.entries()) { need(`others ${i + 1}`, x, ['match', 'role']); if (x.role && !ROLES.includes(x.role)) errors.push(`others ${i + 1}: role must be one of ${ROLES.join(', ')}`); }
  const files = diff.map((f) => {
    const mine = owned.get(f) || [], other = mine.length ? null : others.find((x) => matches(x.match, f.path));
    return { path: f.path, old: f.status === 'renamed' ? f.old : null, status: f.binary ? 'binary' : f.status, add: f.add, del: f.del, changes: mine, role: other?.role || null, note: other?.note || null, url: link(f.path) };
  });
  const loose = files.filter((f) => !f.changes.length && !f.role);
  if (loose.length) errors.push(`${loose.length} file(s) belong to no change and match nothing in others: ${loose.slice(0, 8).map((f) => f.path).join(', ')}${loose.length > 8 ? ', …' : ''}. Add them to a change, or to others with a role (${ROLES.join(', ')}).`);
  for (const [i, x] of others.entries()) if (x.match && !diff.some((f) => matches(x.match, f.path))) warnings.push(`others ${i + 1}: "${x.match}" matches no file`);

  // The map: layers left to right, nodes in each, wires between them.
  let map = null;
  if (cfg.map != null) {
    const M = cfg.map, layers = Array.isArray(M.layers) ? M.layers : [];
    if (!layers.length || layers.length > MAX.layers || !layers.every(isText)) errors.push(`map.layers: 1 to ${MAX.layers} names`);
    const nodes = list('map.nodes', M.nodes, MAX.nodes, 1), nids = new Set();
    for (const [i, nd] of nodes.entries()) {
      const at = `map node ${i + 1}${nd.id ? ` (${nd.id})` : ''}`;
      need(at, nd, ['id', 'label', 'layer']);
      if (nids.has(nd.id)) errors.push(`${at}: id is used twice`);
      nids.add(nd.id);
      if (nd.layer && !layers.includes(nd.layer)) errors.push(`${at}: layer "${nd.layer}" is not in map.layers`);
      known(at, nd.change);
      if (nd.state != null && !NODE_STATES.includes(nd.state)) errors.push(`${at}: state must be one of ${NODE_STATES.join(', ')}`);
    }
    for (const name of layers) if (nodes.filter((nd) => nd.layer === name).length > MAX.perLayer) errors.push(`map layer "${name}" has more than ${MAX.perLayer} nodes`);
    const edges = list('map.edges', M.edges, MAX.edges);
    for (const [i, e] of edges.entries()) {
      const at = `map edge ${i + 1}`;
      for (const k of ['from', 'to']) if (!nids.has(e[k])) errors.push(`${at}: ${k} "${e[k]}" is not a node id`);
      known(at, e.change);
      if (e.state != null && !EDGE_STATES.includes(e.state)) errors.push(`${at}: state must be one of ${EDGE_STATES.join(', ')}`);
      if (words(e.t) > 4) warnings.push(`${at}: label is over 4 words`);
    }
    map = { layers, nodes: nodes.map((nd) => ({ ...nd, state: nd.state || (nd.change ? 'changed' : 'context'), color: byId.get(nd.change)?.color || null, n: byId.get(nd.change)?.n || null })), edges: edges.map((e) => ({ ...e, state: e.state || 'same', color: byId.get(e.change)?.color || null })), src: M.src || 'From reading the code' };
  }

  // Review and checks.
  const R = cfg.review || {};
  const first = list('review.first', R.first, MAX.first).map((x, i) => { need(`review.first ${i + 1}`, x, ['at', 't']); known(`review.first ${i + 1}`, x.change); const m = /^(.+?):(\d+)(?:[-–](\d+))?$/.exec(x.at || ''), f = m && diff.find((d) => d.path === m[1] || d.path.endsWith('/' + m[1])); return { ...x, color: byId.get(x.change)?.color || null, n: byId.get(x.change)?.n || null, url: f ? link(f.path, +m[2]) : null }; });
  const risks = list('review.risks', R.risks, MAX.risks).map((x, i) => { need(`review.risks ${i + 1}`, x, ['level', 't']); if (!LEVELS.includes(x.level)) errors.push(`review.risks ${i + 1}: level must be one of ${LEVELS.join(', ')}`); known(`review.risks ${i + 1}`, x.change); return { ...x, color: byId.get(x.change)?.color || null, n: byId.get(x.change)?.n || null }; });
  const unchecked = R.unchecked == null ? [] : Array.isArray(R.unchecked) && R.unchecked.every(isText) ? R.unchecked : (errors.push('review.unchecked must be a list of texts'), []);
  if (unchecked.length > MAX.unchecked) errors.push(`review.unchecked has ${unchecked.length} entries (max ${MAX.unchecked})`);
  const checks = list('checks', cfg.checks, MAX.checks).map((x, i) => { need(`checks ${i + 1}`, x, ['t', 'state']); if (!CHECK_STATES.includes(x.state)) errors.push(`checks ${i + 1}: state must be one of ${CHECK_STATES.join(', ')}`); if (x.url && !/^https:\/\//.test(x.url)) errors.push(`checks ${i + 1}: url must start with https://`); return x; });
  if (!first.length && !risks.length) warnings.push('review has no first places to look and no risks');
  const level = cfg.risk || [...risks.map((x) => x.level), ...changes.map((c) => c.risk?.level)].filter(Boolean).sort((a, b) => LEVELS.indexOf(b) - LEVELS.indexOf(a))[0] || null;

  const stats = { files: diff.length, add: diff.reduce((s, f) => s + f.add, 0), del: diff.reduce((s, f) => s + f.del, 0) };
  const brief = { source: cfg.source || null, answer: cfg.answer, stats, risk: level, effort: cfg.effort || null, checks, changes, map, review: { heading: R.heading || null, say: R.say || null, first, risks, unchecked }, files, sources: Array.isArray(cfg.sources) ? cfg.sources : [] };
  const frames = [
    { layout: 'overview', key: 'Overview', heading: cfg.answer, say: '', color: 'ink' },
    ...(map ? [{ layout: 'map', key: 'Map', heading: 'Where it lands', say: '', color: 'ink' }] : []),
    ...changes.map((c) => ({ layout: 'change', ref: c.id, key: c.key, heading: c.title, say: c.what, color: c.color })),
    { layout: 'review', key: 'Review', heading: R.heading || 'Where to look first', say: R.say || '', color: 'rose' },
    { layout: 'files', key: 'Files', heading: `All ${stats.files} files`, say: '', color: 'teal' },
  ];
  return { frames, brief };
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = process.argv[2];
  if (!path) { console.error('usage: node change.mjs <change.diff>'); process.exit(2); }
  const files = parseDiff(readFileSync(path, 'utf8'));
  const add = files.reduce((s, f) => s + f.add, 0), del = files.reduce((s, f) => s + f.del, 0);
  console.log(`${files.length} files, +${add} −${del}. Line ranges are new-side; deleted files show old-side.\n`);
  for (const f of files) {
    const side = f.status === 'deleted' ? 'old' : 'new';
    console.log(`${f.path}  +${f.add} −${f.del}${f.status === 'modified' ? '' : '  ' + f.status + (f.status === 'renamed' ? ' from ' + f.old : '')}${f.binary ? '  binary' : ''}`);
    for (const h of f.hunks) console.log(`  ${side === 'old' ? h.o + '–' + (h.o + Math.max(0, h.oc - 1)) : h.n + '–' + (h.n + Math.max(0, h.nc - 1))}  +${h.lines.filter((x) => x.s === '+').length} −${h.lines.filter((x) => x.s === '-').length}${h.at ? '  ' + h.at.slice(0, 70) : ''}`);
  }
}
