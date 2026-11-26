// Comments saved beside the story, so it reopens with its pins. Everything read from the file or the page is cleaned here.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { checker } from './check.mjs';

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v) => (Number.isInteger(v) && v >= 0 && v < 2000 ? v : null);
const part = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const id = (v) => (/^[a-z0-9]{1,24}$/.test(v) ? v : '');
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === 'object') : []);

/** One id per step, from its content: a pin stays exact only while its step is unchanged. */
export const ids = (frames, custom) => frames.map(({ notes, ...f }) => 's' + createHash('sha256').update(JSON.stringify(f) + (JSON.stringify(f).includes('"custom"') ? custom : '')).digest('hex').slice(0, 16));

export function clean(d) {
  const added = list(d?.added, 30).map((a) => {
    const f = a.frame && typeof a.frame === 'object' ? a.frame : {}, k = checker();
    const frame = { key: f.key, heading: f.heading, say: f.say, color: f.color, pic: f.pic, src: str(f.src, 200) };
    try { k.frame('step', frame); } catch { return null; }
    return k.errors.length || !id(a.id) ? null : { id: id(a.id), after: id(a.after), n: int(a.n) || 1, frame };
  }).filter(Boolean);
  const threads = list(d?.threads, 200).map((t) => ({
    step: id(t.step), n: int(t.n) || 1, heading: str(t.heading, 200), spot: int(t.spot), chart: int(t.chart), fx: part(t.fx), fy: part(t.fy),
    about: str(t.about, 300), exact: str(t.exact, 600), on: typeof t.on === 'boolean' ? t.on : null, quote: t.quote === true, seen: str(t.seen, 1200), drawn: id(t.drawn),
    msgs: list(t.msgs, 60).map((m) => ({ q: str(m.q, 1000), text: str(m.text, 8000), source: ['story', 'web', 'general', 'unsure'].includes(m.source) ? m.source : null, done: m.done === true, note: m.note === true })).filter((m) => m.q && m.text),
  })).filter((t) => t.about && t.msgs.length);
  return { added, threads };
}

export function store(path) {
  let data = { added: [], threads: [] }, rev = 1;
  if (existsSync(path)) {
    let raw;
    try { raw = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error(`${path} is not valid JSON. Move or fix it, so comments in it are not lost.`); }
    // Never overwrite a file that is not ours.
    if (raw?.kind !== 'visualize-interactive comments') throw new Error(`${path} is not a comments file. Choose another with --comments.`);
    data = clean(raw);
  }
  return {
    get: () => ({ rev, ...data }),
    // Two open pages: the one that has not seen the other's change is refused, so it cannot erase it.
    save(next) {
      if (next?.rev !== rev) return null;
      const d = clean(next), tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
      writeFileSync(tmp, JSON.stringify({ kind: 'visualize-interactive comments', saved: new Date().toISOString(), ...d }, null, 1), { mode: 0o600 });
      renameSync(tmp, path);
      data = d;
      return ++rev;
    },
  };
}
