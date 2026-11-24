#!/usr/bin/env node
// Build a storyboard page: node build.mjs <visualize.json> <out.html> [custom.js]
// Validates the input against references/format.md and inlines everything into one HTML file. Exits 1 on any error.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const [input, out, customPath] = process.argv.slice(2);
if (!input || !out) { console.error('usage: node build.mjs <visualize.json> <out.html> [custom.js]'); process.exit(2); }

const cfg = JSON.parse(readFileSync(input, 'utf8'));
const custom = customPath ? readFileSync(customPath, 'utf8') : '';
const errors = [], warnings = [];
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const COLORS = ['orange', 'blue', 'violet', 'rose', 'teal'];
const TONES = { terminal: ['cmd', 'out', 'err', 'muted', 'hi'], file: ['out', 'muted', 'hi', 'add', 'del'] };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);

function list(at, name, v, max) {
  if (!Array.isArray(v) || !v.length) { errors.push(`${at}: ${name} is empty`); return []; }
  if (v.length > max) errors.push(`${at}: ${name} has ${v.length} entries (max ${max})`);
  return v;
}
const need = (at, o, keys) => { for (const k of keys) if (o?.[k] == null || o[k] === '') errors.push(`${at}: ${k} is missing`); };

const CHECK = {
  chart(at, p) {
    need(at, p, ['label']);
    for (const k of ['x', 'y']) if (!isPair(p[k]) || p[k][0] >= p[k][1]) errors.push(`${at}: ${k} must be [low, high]`);
    for (const s of list(at, 'series', p.series, 6)) {
      if (!Array.isArray(s.points) || s.points.length < 2 || !s.points.every(isPair)) errors.push(`${at}: a series needs two or more [x, y] points`);
      else if (isPair(p.x) && isPair(p.y) && s.points.some(([x, y]) => x < p.x[0] || x > p.x[1] || y < p.y[0] || y > p.y[1])) errors.push(`${at}: a point lies outside the chart's x or y range`);
    }
    for (const n of p.notes || []) if (!isNum(n.x) || !isNum(n.y) || !n.t) errors.push(`${at}: a note needs x, y and t`);
  },
  grid(at, p) { for (const i of list(at, 'items', p.items, 120)) need(at, i, ['t']); },
  bars(at, p) {
    for (const r of list(at, 'rows', p.rows, 10)) { need(at, r, ['label']); if (!Array.isArray(r.parts) || !r.parts.length || !r.parts.every((v) => isNum(v) && v >= 0)) errors.push(`${at}: bar "${r.label}" needs parts, as numbers of 0 or more`); }
    for (const c of p.colors || []) if (!COLORS.includes(c)) errors.push(`${at}: color "${c}" is not one of ${COLORS.join(', ')}`);
  },
  flow(at, p) { for (const s of list(at, 'steps', p.steps, 6)) need(at, s, ['t']); },
  swap(at, p) { for (const r of list(at, 'rows', p.rows, 4)) need(at, r, ['from', 'to']); },
  compare(at, p) { for (const k of ['left', 'right']) { need(`${at}.${k}`, p[k], ['title', 'pic']); if (p[k]?.pic) picture(`${at}.${k}`, p[k].pic, true); } },
  terminal(at, p) { lines(at, p); },
  file(at, p) { need(at, p, ['name']); lines(at, p); },
  status(at, p) { for (const r of list(at, 'rows', p.rows, 6)) { need(at, r, ['tag', 't']); if (!COLORS.includes(r.color)) errors.push(`${at}: status color "${r.color}" is not one of ${COLORS.join(', ')}`); } },
  custom(at, p) { need(at, p, ['id']); if (p.id && !new RegExp(`PICS(\\.${p.id}\\b|\\[["']${p.id}["']\\])`).test(custom)) errors.push(`${at}: the custom file does not define PICS.${p.id}`); },
};
function lines(at, p) {
  for (const l of list(at, 'lines', p.lines, 10)) { if (l.t == null) errors.push(`${at}: a line has no t`); if (!TONES[p.kind].includes(l.tone || 'out')) errors.push(`${at}: tone "${l.tone}" is not allowed in a ${p.kind}`); }
}
function picture(at, p, inner) {
  if (!Object.hasOwn(CHECK, p.kind) || (inner && p.kind === 'compare')) { errors.push(`${at}: picture kind "${p.kind}" is not allowed`); return; }
  CHECK[p.kind](`${at} ${p.kind}`, p);
}

need('story', cfg, ['title', 'ask']);
const frames = Array.isArray(cfg.frames) ? cfg.frames : [];
if (frames.length < 2 || frames.length > 9) errors.push(`frames: ${frames.length} steps (2 to 9)`);
frames.forEach((f, i) => {
  const at = `step ${i + 1}`;
  need(at, f, ['key', 'heading', 'say', 'pic', 'src']);
  if (!COLORS.includes(f.color)) errors.push(`${at}: color must be one of ${COLORS.join(', ')}`);
  if (words(f.key) > 2) warnings.push(`${at}: key is over 2 words`);
  if (words(f.heading) > 7) warnings.push(`${at}: heading is ${words(f.heading)} words (aim for 7)`);
  if (words(f.say) > 32) warnings.push(`${at}: say is ${words(f.say)} words (aim for 30 or fewer)`);
  const marks = String(f.say || '').split('**').length - 1;
  if (marks % 2) errors.push(`${at}: say has an unclosed **`);
  if ((String(f.say || '').split('`').length - 1) % 2) errors.push(`${at}: say has an unclosed backtick`);
  if (marks > 4) warnings.push(`${at}: say highlights more than two phrases`);
  if (f.big) { need(`${at} big`, f.big, ['value', 'label']); if (String(f.big.value).length > 10) warnings.push(`${at}: big.value is over 10 characters`); }
  if (f.pic) picture(at, f.pic);
});
for (const s of cfg.sources || []) { need('source', s, ['label', 'url']); if (!/^https:\/\//.test(s.url || '')) errors.push(`source "${s.label}": url must start with https://`); }
if (/<\/script|<!--/i.test(custom)) errors.push('the custom file must not contain "</script" or "<!--"');

const app = readFileSync(join(here, '..', 'assets', 'app.js'), 'utf8');
for (const [name, code] of [['custom file', custom], ['app.js', app]]) try { new Script(code); } catch (e) { errors.push(`${name}: ${e.message}`); }

for (const w of warnings) console.warn('warning: ' + w);
if (errors.length) { for (const e of errors) console.error('error: ' + e); console.error(`${errors.length} error(s); nothing written.`); process.exit(1); }

const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const json = JSON.stringify(cfg).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// One pass, so text inside the story can never be taken for a placeholder.
const fill = { TITLE: esc(cfg.title), CONFIG: json, CUSTOM: custom, APP: app };
writeFileSync(out, readFileSync(join(here, '..', 'assets', 'page.html'), 'utf8').replace(/__(TITLE|CONFIG|CUSTOM|APP)__/g, (_, k) => fill[k]));
console.log(`wrote ${out}: ${frames.length} steps, ${warnings.length} warning(s)`);
