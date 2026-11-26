// Validates steps, both the agent's and the ones a small model draws while the page is open.
export const COLORS = ['orange', 'blue', 'violet', 'rose', 'teal'];
const TONES = { terminal: ['cmd', 'out', 'err', 'muted', 'hi'], file: ['out', 'muted', 'hi', 'add', 'del'] };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);
const isText = (v) => (typeof v === 'string' && v.trim() !== '') || isNum(v);

export function checker(custom = '') {
  const errors = [], warnings = [];
  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const list = (at, name, v, max) => {
    if (!Array.isArray(v) || !v.length) { errors.push(`${at}: ${name} is empty`); return []; }
    if (v.length > max) errors.push(`${at}: ${name} has ${v.length} entries (max ${max})`);
    return v.filter((x) => { const ok = x && typeof x === 'object'; if (!ok) errors.push(`${at}: ${name} must hold objects`); return ok; });
  };
  const need = (at, o, keys) => { for (const k of keys) if (!isText(o?.[k])) errors.push(`${at}: ${k} is missing or not text`); };
  const lines = (at, p) => { for (const l of list(at, 'lines', p.lines, 10)) { if (typeof l.t !== 'string') errors.push(`${at}: a line has no t`); if (!TONES[p.kind].includes(l.tone || 'out')) errors.push(`${at}: tone "${l.tone}" is not allowed in a ${p.kind}`); } };
  const CHECK = {
    chart(at, p) {
      need(at, p, ['label']);
      for (const k of ['x', 'y']) if (!isPair(p[k]) || p[k][0] >= p[k][1]) errors.push(`${at}: ${k} must be [low, high]`);
      for (const s of list(at, 'series', p.series, 6)) {
        if (!Array.isArray(s.points) || s.points.length < 2 || !s.points.every(isPair)) errors.push(`${at}: a series needs two or more [x, y] points`);
        else if (isPair(p.x) && isPair(p.y) && s.points.some(([x, y]) => x < p.x[0] || x > p.x[1] || y < p.y[0] || y > p.y[1])) errors.push(`${at}: a point lies outside the chart's x or y range`);
      }
      if (p.notes != null && !Array.isArray(p.notes)) errors.push(`${at}: notes must be a list`);
      else for (const n of p.notes || []) if (!isNum(n?.x) || !isNum(n?.y) || !n?.t) errors.push(`${at}: a note needs x, y and t`);
    },
    grid(at, p) { for (const i of list(at, 'items', p.items, 120)) need(at, i, ['t']); if (p.columns != null && !(isNum(p.columns) && p.columns >= 1 && p.columns <= 20)) errors.push(`${at}: columns must be 1 to 20`); },
    bars(at, p) {
      for (const r of list(at, 'rows', p.rows, 10)) { need(at, r, ['label']); if (!Array.isArray(r.parts) || !r.parts.length || !r.parts.every((v) => isNum(v) && v >= 0)) errors.push(`${at}: bar "${r.label}" needs parts, as numbers of 0 or more`); }
      if (p.colors != null && (!Array.isArray(p.colors) || p.colors.some((c) => !COLORS.includes(c)))) errors.push(`${at}: colors must be a list from ${COLORS.join(', ')}`);
    },
    flow(at, p) { for (const s of list(at, 'steps', p.steps, 6)) need(at, s, ['t']); },
    swap(at, p) { for (const r of list(at, 'rows', p.rows, 4)) need(at, r, ['from', 'to']); },
    compare(at, p) { for (const k of ['left', 'right']) { need(`${at}.${k}`, p[k], ['title']); if (p[k]?.pic) picture(`${at}.${k}`, p[k].pic, true); else errors.push(`${at}.${k}: pic is missing`); } },
    terminal(at, p) { lines(at, p); },
    file(at, p) { need(at, p, ['name']); lines(at, p); },
    status(at, p) { for (const r of list(at, 'rows', p.rows, 6)) { need(at, r, ['tag', 't']); if (!COLORS.includes(r.color)) errors.push(`${at}: status color "${r.color}" is not one of ${COLORS.join(', ')}`); } },
    custom(at, p) { if (!/^[a-z][a-z0-9]*$/i.test(p.id || '') || !new RegExp(`PICS\\.${p.id}\\b`).test(custom)) errors.push(`${at}: the custom file does not define PICS.${p.id}`); },
  };
  function picture(at, p, inner) {
    if (!p || typeof p !== 'object' || !Object.hasOwn(CHECK, p.kind) || (inner && p.kind === 'compare')) { errors.push(`${at}: picture kind "${p?.kind}" is not allowed`); return; }
    CHECK[p.kind](`${at} ${p.kind}`, p);
  }
  function frame(at, f) {
    need(at, f, ['key', 'heading', 'say', 'src']);
    if (!COLORS.includes(f.color)) errors.push(`${at}: color must be one of ${COLORS.join(', ')}`);
    if ((String(f.say || '').split('**').length - 1) % 2) errors.push(`${at}: say has an unclosed **`);
    if ((String(f.say || '').split('`').length - 1) % 2) errors.push(`${at}: say has an unclosed backtick`);
    if (f.big) need(`${at} big`, f.big, ['value', 'label']);
    if (f.notes != null && (!Array.isArray(f.notes) || !f.notes.every(isText))) errors.push(`${at}: notes must be a list of texts`);
    if (words(f.key) > 2) warnings.push(`${at}: key is over 2 words`);
    if (words(f.heading) > 7) warnings.push(`${at}: heading is ${words(f.heading)} words (aim for 7)`);
    if (words(f.say) > 32) warnings.push(`${at}: say is ${words(f.say)} words (aim for 30 or fewer)`);
    if (String(f.say || '').split('**').length > 5) warnings.push(`${at}: say highlights more than two phrases`);
    if (String(f.big?.value ?? '').length > 10) warnings.push(`${at}: big.value is over 10 characters`);
    picture(at, f.pic);
  }
  return { errors, warnings, need, frame, picture };
}
