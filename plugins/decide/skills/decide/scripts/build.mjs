#!/usr/bin/env node
// Build a decide review page: node build.mjs <decide.json> <out.html>
// Validates the input against references/format.md, inlines it with the app into one self-contained HTML file,
// and syntax-checks the result. Exits 1 and lists every problem when the input breaks a rule.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const [input, out] = process.argv.slice(2);
if (!input || !out) { console.error('usage: node build.mjs <decide.json> <out.html>'); process.exit(2); }

const cfg = JSON.parse(readFileSync(input, 'utf8'));
const problems = [];
const warn = [];
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

const CHOICES = cfg.choices || ['keep', 'change', 'docs', 'unsure'];
const KNOWN = ['keep', 'change', 'docs', 'unsure'];
for (const c of CHOICES) if (!KNOWN.includes(c) && !(cfg.wording?.choices?.[c]?.label)) problems.push(`choice "${c}" is not built in; give it wording.choices.${c}.label and .side`);
const groups = cfg.groups || [{ id: 'all' }];
const gids = new Set(groups.map((g) => g.id));
if (!cfg.title) problems.push('title is missing');
if (!Array.isArray(cfg.questions) || !cfg.questions.length) problems.push('questions is empty');
const seen = new Set();
const TONES = { terminal: ['cmd', 'out', 'err', 'muted', 'hi'], file: ['out', 'muted', 'hi', 'add', 'del'] };
const STATES = ['ok', 'fail', 'stuck', 'now'];

function checkPanel(id, which, p) {
  if (!p) { problems.push(`${id}: visual.${which} is missing`); return; }
  if (!['terminal', 'file', 'steps'].includes(p.kind)) { problems.push(`${id}: visual.${which}.kind must be terminal, file or steps`); return; }
  if (p.kind === 'steps') {
    const st = p.steps || [];
    if (!st.length) problems.push(`${id}: visual.${which} has no steps`);
    if (st.length > 6) problems.push(`${id}: visual.${which} has ${st.length} steps (max 6)`);
    for (const s of st) {
      if (!STATES.includes(s.state)) problems.push(`${id}: visual.${which} step "${s.label}" has state "${s.state}"`);
      if (words(s.label) > 5) warn.push(`${id}: step label "${s.label}" is over 5 words`);
    }
    return;
  }
  const lines = p.lines || [];
  if (!lines.length) problems.push(`${id}: visual.${which} has no lines`);
  if (lines.length > 8) problems.push(`${id}: visual.${which} has ${lines.length} lines (max 8)`);
  const his = lines.filter((l) => l.tone === 'hi').length;
  if (his > 3) problems.push(`${id}: visual.${which} highlights ${his} lines (max 3)`);
  for (const l of lines) {
    if (!TONES[p.kind].includes(l.tone || 'out')) problems.push(`${id}: visual.${which} line tone "${l.tone}" is not allowed in a ${p.kind}`);
    if (String(l.t).length > 90) warn.push(`${id}: a ${which} line is ${String(l.t).length} characters (aim for 72)`);
  }
  if (p.kind === 'terminal' && lines[0]?.tone !== 'cmd') problems.push(`${id}: visual.${which} must start with its command (tone "cmd")`);
  if (p.kind === 'terminal' && lines.filter((l) => l.tone === 'cmd').length > 1) warn.push(`${id}: visual.${which} has more than one command`);
  if (p.kind === 'file' && !p.name) problems.push(`${id}: visual.${which} file has no name`);
}

for (const q of cfg.questions || []) {
  const id = q.id || '(no id)';
  if (!q.id) problems.push('a question has no id');
  if (seen.has(q.id)) problems.push(`${id}: duplicate id`);
  seen.add(q.id);
  if (q.group && !gids.has(q.group)) problems.push(`${id}: group "${q.group}" is not in groups`);
  for (const k of ['h', 'today', 'change', 'why']) if (!q[k]) problems.push(`${id}: ${k} is missing`);
  if (q.h && !/\?$/.test(q.h.trim())) warn.push(`${id}: h should be a question ending in "?"`);
  if (words(q.h) > 14) warn.push(`${id}: h is ${words(q.h)} words (aim for 12 or fewer)`);
  for (const k of ['today', 'why', 'change', 'recWhy']) {
    const sentences = String(q[k] || '').split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const s of sentences) if (words(s) > 24) warn.push(`${id}: a sentence in ${k} has ${words(s)} words (aim for 20 or fewer)`);
    if (sentences.length > 3) warn.push(`${id}: ${k} has ${sentences.length} sentences (keep it to 1-2)`);
  }
  if (q.rec && !CHOICES.includes(q.rec)) problems.push(`${id}: rec "${q.rec}" is not one of ${CHOICES.join(', ')}`);
  if (q.rec && !q.recWhy) warn.push(`${id}: rec has no recWhy`);
  if (!q.visual) problems.push(`${id}: visual is missing (every question gets a Today | Change picture)`);
  else {
    if (!q.visual.caption) warn.push(`${id}: visual.caption is missing`);
    else if (words(q.visual.caption) > 16) warn.push(`${id}: visual.caption is ${words(q.visual.caption)} words (max 16)`);
    checkPanel(id, 'today', q.visual.today);
    checkPanel(id, 'after', q.visual.after);
    if (q.visual.today && q.visual.after && q.visual.today.kind !== q.visual.after.kind) warn.push(`${id}: today and after use different kinds; use the same kind so they compare`);
  }
}
for (const g of groups) if (g.review && !g.review.heading) warn.push(`group ${g.id}: review.heading is missing`);

for (const w of warn) console.warn('warning: ' + w);
if (problems.length) { for (const p of problems) console.error('error: ' + p); console.error(`${problems.length} error(s); nothing written.`); process.exit(1); }

// JSON inside a <script>: escape "<" (so "</script>" cannot close it) and the two JS line separators.
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const app = readFileSync(join(here, '..', 'assets', 'app.js'), 'utf8');
const html = readFileSync(join(here, '..', 'assets', 'page.html'), 'utf8')
  .replace('__TITLE__', () => esc(cfg.title))
  .replace('__CONFIG__', () => safeJson(cfg))
  .replace('__APP__', () => app);
writeFileSync(out, html);

const probe = join(tmpdir(), `decide-check-${process.pid}.js`);
writeFileSync(probe, html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).replace('</script>\n<script>', '\n'));
const r = spawnSync(process.execPath, ['--check', probe], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`wrote ${out}: ${cfg.questions.length} questions, ${groups.filter((g) => g.review).length} group reviews${cfg.extras?.items?.length ? ', ' + cfg.extras.items.length + ' extras' : ''}, ${warn.length} warning(s)`);
