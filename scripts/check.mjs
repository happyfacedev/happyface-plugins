#!/usr/bin/env node
// Repository checks, before a push: every example builds without a warning, and visualize and
// visualize-interactive hold identical copies of the files they share. Plugins install separately,
// so a shared file has to live in both.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = join(root, 'plugins/visualize/skills/visualize');
const I = join(root, 'plugins/visualize-interactive/skills/visualize-interactive');
const D = join(root, 'plugins/decide/skills/decide');
const SHARED = ['scripts/change.mjs', 'assets/change.js', 'assets/change.css', 'references/change-format.md', 'references/example-change.json', 'references/example-change.diff'];
let failed = 0;

for (const f of SHARED) {
  const same = readFileSync(join(V, f), 'utf8') === readFileSync(join(I, f), 'utf8');
  console.log(`${same ? 'ok  ' : 'FAIL'} shared ${f}${same ? '' : ': the two copies differ'}`);
  if (!same) failed++;
}

const out = mkdtempSync(join(tmpdir(), 'happyface-check-'));
const run = (label, args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const ok = r.status === 0 && !/^warning:/m.test(r.stderr);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : '\n' + (r.stdout + r.stderr).trim().replace(/^/gm, '     ')}`);
  if (!ok) failed++;
};
run('decide example', [join(D, 'scripts/build.mjs'), join(D, 'references/example.json'), join(out, 'decide.html')]);
run('visualize storyboard', [join(V, 'scripts/build.mjs'), join(V, 'references/example.json'), join(out, 'story.html')]);
run('visualize custom pictures', [join(V, 'scripts/build.mjs'), join(V, 'references/example-riemann.json'), join(out, 'riemann.html'), join(V, 'references/example-riemann.js')]);
run('visualize change brief', [join(V, 'scripts/build.mjs'), join(V, 'references/example-change.json'), join(out, 'brief.html'), '--diff', join(V, 'references/example-change.diff')]);
// serve.mjs looks for an installed client before it checks, as it does in use.
run('interactive storyboard', [join(I, 'scripts/serve.mjs'), join(I, 'references/example.json'), '--check']);
run('interactive custom pictures', [join(I, 'scripts/serve.mjs'), join(I, 'references/example-riemann.json'), join(I, 'references/example-riemann.js'), '--background', join(I, 'references/example-riemann-background.md'), '--check']);
run('interactive change brief', [join(I, 'scripts/serve.mjs'), join(I, 'references/example-change.json'), '--diff', join(I, 'references/example-change.diff'), '--check']);
rmSync(out, { recursive: true, force: true });

console.log(failed ? `${failed} check(s) failed.` : 'All checks passed.');
process.exit(failed ? 1 : 0);
