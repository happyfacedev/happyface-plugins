// decide: one decision per screen; each option's picture is the thing you click.
// Everything specific to one review comes from CONFIG (see references/format.md). Answers live in localStorage
// and leave the page only through "Copy answers".
(() => {
  const C = CONFIG;
  const W = C.wording || {};
  const T = {
    recommended: "Recommended.", unsure: "Not sure", addNote: "Add a note", noteLabel: "Note", next: "Next",
    acceptAll: "Accept all recommendations", copy: "Copy answers", copyOne: "Copy answer",
    safety: "Nothing changes until you paste these into the chat. Anything permanent is confirmed with you again.", ...W,
  };
  const BUILTIN = { keep: ["Keep it", "today"], change: ["Change it", "after"], docs: ["Keep it, fix the wording", "today"] };

  // ---------- one shape for every screen ----------
  const groups = C.groups || [{ id: "all" }];
  const toOptions = (q) => (q.options ? q.options : (C.choices || ["keep", "change", "docs", "unsure"]).filter((k) => k !== "unsure").map((k) => {
    const w = (W.choices || {})[k] || {}, [name, builtinSide] = BUILTIN[k] || [k, null];
    const side = w.side === undefined ? builtinSide : w.side;
    const goes = q.goes && q.goes[k];
    return { id: k, name: w.label || name, pic: side ? (q.visual || {})[side] : null,
      does: goes || (k === "keep" ? q.today : k === "change" ? q.change : k === "docs" ? "Behaviour stays. Only the text changes." : "") };
  }));
  const verdicts = (r) => (r.options || [["approve", "Yes, approve it", "Everything in it counts as confirmed."], ["look", "Mostly, read parts with me first", "Name them in a note."], ["hold", "Not yet", "It stays as it is for now."]]).map(([id, name, does]) => ({ id, name, does }));
  const STEPS = [];
  for (const g of groups) {
    for (const q of (C.questions || []).filter((x) => (x.group || groups[0].id) === g.id)) STEPS.push({ kind: "q", id: q.id, g, h: q.h, why: q.why, rec: q.rec, recWhy: q.recWhy, ref: q.ref, caption: (q.visual || {}).caption, showIf: q.showIf, options: toOptions(q) });
    if (g.review) STEPS.push({ kind: "q", id: "group:" + g.id, g, h: g.review.heading || "Is " + (g.label || g.id) + " right?", why: [g.summary, g.review.intro].filter(Boolean).join(" "), options: verdicts(g.review), items: g.review.items });
  }
  if (C.batch) STEPS.push({ kind: "batch", id: "batch", h: C.batch.heading, why: C.batch.why, items: C.batch.items });
  if (C.extras && (C.extras.items || []).length) STEPS.push({ kind: "extras", id: "extras", h: C.extras.heading, why: C.extras.intro, items: C.extras.items });
  const single = STEPS.length === 1 && STEPS[0].kind === "q";
  if (!single) STEPS.push({ kind: "end", id: "end", h: "Check your answers" });

  // ---------- state ----------
  const KEY = C.storageKey || "decide-" + String(C.title || "review").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const blank = () => ({ v: 2, at: 0, a: {}, n: {}, u: {}, seen: {}, sig: {} });
  let S = blank();
  try { const raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw && raw.v === 2) S = Object.assign(S, raw); } catch (e) {}
  const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) | 0; return h; };
  // A rebuild that rewrites a question must not inherit the answer to the old wording.
  const sign = () => { for (const s of STEPS) { const sig = hash(JSON.stringify([s.h, s.why, s.options, s.items])); if (S.sig[s.id] !== sig) { for (const k of ["a", "n", "u", "seen"]) delete S[k][s.id]; S.sig[s.id] = sig; } } };
  sign();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const shown = (s, seen = []) => {
    if (!s.showIf) return true;
    const on = STEPS.find((x) => x.id === s.showIf.question);
    if (!on || seen.includes(s.id) || !shown(on, [...seen, s.id])) return false;
    const a = S.a[on.id];
    return s.showIf.is ? s.showIf.is.includes(a) : !(s.showIf.not || []).includes(a);
  };
  const visible = () => STEPS.filter((s) => shown(s));
  const picked = (s) => (S.u[s.id] ? null : s.options.find((o) => o.id === S.a[s.id]) || null);
  const ready = (s) => s.kind !== "q" || !!S.u[s.id] || !!picked(s);
  let returning = false;

  // ---------- dom ----------
  const $ = (id) => document.getElementById(id);
  const view = $("view");
  const el = (t, p = {}, ...kids) => {
    const n = document.createElement(t);
    for (const [k, v] of Object.entries(p)) { if (v == null || v === false) continue; if (k === "text") n.textContent = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v); }
    n.append(...kids.filter((x) => x != null && x !== false));
    return n;
  };
  const dom = (s) => "s" + STEPS.indexOf(s);
  // Teal means recommended or done and rose means permanent, so questions take turns with the other three.
  const hue = (s) => (s.kind === "end" ? "teal" : ["blue", "violet", "orange"][STEPS.indexOf(s) % 3]);
  const board = (s, tell, ...body) => view.append(el("section", { class: "board" }, el("div", { class: "tell" }, ...tell), el("div", { class: "body" }, ...body)));

  function picture(p) {
    if (!p) return null;
    if (p.kind === "terminal") return el("div", { class: "term" }, ...(p.lines || []).map((l) => el("div", { class: "ln " + (l.tone || "out") }, l.tone === "cmd" ? "$ " : "", l.t)), p.exit != null ? el("div", { class: "exit" + (p.exit ? " bad" : ""), text: "exit code " + p.exit }) : null);
    if (p.kind === "file") return el("div", { class: "file" }, el("div", { class: "fname", text: p.name || "" }), el("div", { class: "body" }, ...(p.lines || []).map((l) => el("div", { class: "ln " + (l.tone || "out") }, l.tone === "add" ? "+ " : l.tone === "del" ? "− " : "", l.t))));
    if (p.kind === "steps") {
      const mark = { ok: "✓", fail: "✕", stuck: "■", now: "●" }, word = { ok: "done", fail: "failed", stuck: "stuck", now: "next" };
      return el("div", {}, el("ol", { class: "flow" }, ...(p.steps || []).map((s) => el("li", { class: s.state || "ok" }, el("b", { "aria-hidden": "true", text: mark[s.state] || "✓" }), el("span", {}, s.who ? el("strong", { text: s.who + ": " }) : null, s.label, el("span", { class: "sr", text: " (" + (word[s.state] || "done") + ")" }))))), p.note ? el("p", { class: "pnote", text: p.note }) : null);
    }
    if (p.kind === "numbers") return el("table", { class: "nums" }, el("tbody", {}, ...(p.rows || []).map((r) => el("tr", {}, el("th", { scope: "row", text: r.label }), el("td", { class: r.tone || null, text: r.value })))));
    return null;
  }

  function viewQuestion(s) {
    const set = el("fieldset", { class: "options", style: "--n:" + s.options.length }, el("legend", { class: "sr", text: s.h }));
    s.options.forEach((o, i) => {
      const id = dom(s) + "-" + i;
      const input = el("input", { type: "radio", name: dom(s), id, onchange: () => { S.a[s.id] = o.id; delete S.u[s.id]; save(); foot(s); } });
      input.checked = !S.u[s.id] && S.a[s.id] === o.id;
      const facts = Object.entries(o.facts || {});
      set.append(el("label", { class: "opt", for: id },
        el("div", { class: "head" }, input, el("span", { class: "key", "aria-hidden": "true", text: i + 1 }), el("span", { class: "name", text: o.name }), o.does ? el("span", { class: "does", text: o.does }) : null),
        el("div", { class: "pic" }, picture(o.pic), o.src ? el("span", { class: "src", text: o.src }) : null),
        el("dl", { class: "facts" + (facts.length ? "" : " none") }, ...facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]), o.permanent ? el("dd", { class: "perm", text: "Permanent: this cannot be undone" }) : null),
        el("div", { class: "rec" + (s.rec === o.id ? " on" : "") }, s.rec === o.id ? el("b", { text: T.recommended + " " }) : null, s.rec === o.id ? s.recWhy || "" : null)));
    });
    const ta = el("textarea", { id: "notetext", oninput: (e) => { S.n[s.id] = e.target.value; save(); } });
    ta.value = S.n[s.id] || "";
    const note = el("div", { class: "note", id: "note" }, el("label", { for: "notetext", text: T.noteLabel }), ta);
    note.hidden = !ta.value;
    const first = STEPS.indexOf(s) === 0;
    board(s, [first && C.intro ? el("p", { class: "intro", text: C.intro }) : null, el("h1", { text: s.h }), s.why ? el("p", { class: "why", text: s.why }) : null, s.caption ? el("p", { class: "cap", text: s.caption }) : null], set,
      (s.items || []).length ? el("div", { class: "items" }, ...s.items.map((it) => el("details", {}, el("summary", {}, it.title, it.count ? el("span", { class: "ft", text: it.count }) : null), it.intro ? el("p", { text: it.intro }) : null, el("ul", {}, ...(it.details || []).map((d) => el("li", {}, d.id ? d.id + " " : "", d.text))), it.ref ? el("span", { class: "ft", text: it.ref }) : null))) : "",
      note, s.ref ? el("p", { class: "ref", text: s.id + " · " + s.ref }) : "", el("p", { class: "status", id: "status", role: "status" }), el("pre", { id: "out", hidden: true }));
  }

  function viewList(s) {
    const batch = s.kind === "batch";
    if (!S.a[s.id]) S.a[s.id] = batch ? s.items.map((i) => i.id) : [];
    const boxes = s.items.map((it, i) => {
      const cb = el("input", { type: "checkbox", id: "c" + i, onchange: () => { S.a[s.id] = s.items.filter((x, k) => $("c" + k).checked).map((x) => x.id); save(); foot(s); } });
      cb.checked = S.a[s.id].includes(it.id);
      return el("label", { class: "check" + (batch ? " two" : ""), for: "c" + i }, cb,
        el("span", {}, el("b", { text: batch ? it.name : it.text }), batch ? el("span", { class: "ft", text: "Today: " + it.today }) : el("span", { class: "ft", text: it.id })),
        batch ? el("span", { class: "after" }, el("span", { class: "ft", text: "After" }), it.after) : null);
    });
    board(s, [el("h1", { text: s.h }), s.why ? el("p", { class: "why", text: s.why }) : null], el("div", { class: "rows" }, ...boxes));
  }

  function answer(s) {
    if (s.kind === "batch") return S.seen[s.id] ? S.a[s.id].length + " of " + s.items.length + " accepted" : "Not answered";
    if (s.kind === "extras") return S.seen[s.id] ? S.a[s.id].length + " of " + s.items.length + " selected" : "Not answered";
    const o = picked(s);
    return S.u[s.id] ? T.unsure : o ? o.name : "Not answered";
  }

  function viewEnd(s) {
    const open = visible().filter((x) => x.kind !== "end" && answer(x) === "Not answered").length;
    const rows = STEPS.filter((x) => x.kind !== "end").map((x) => {
      const off = !shown(x), o = x.kind === "q" ? picked(x) : null, note = (S.n[x.id] || "").trim();
      return el("div", { class: "row " + hue(x) }, el("span", { class: "q", text: x.h }),
        el("span", { class: "a" + (off ? " skip" : "") }, off ? "Skipped: an earlier answer settled it" : answer(x), !off && o && x.rec && o.id !== x.rec ? el("span", { class: "tag", text: "Not my recommendation" }) : null, !off && o && o.permanent ? el("span", { class: "tag perm", text: "Permanent" }) : null),
        note && !off ? el("span", { class: "n", text: "Note: " + note }) : null,
        off ? null : el("button", { class: "link", type: "button", onclick: () => { returning = true; go(visible().indexOf(x)); } }, "Change", el("span", { class: "sr", text: " " + x.h })));
    });
    board(s, [el("h1", { text: s.h }), el("p", { class: "why", text: (open ? open + " not answered; I will ask you about " + (open === 1 ? "it" : "them") + ". " : "") + T.safety })], el("div", { class: "rows" }, ...rows),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "button", onclick: copy }, T.copy), el("button", { class: "link", type: "button", onclick: () => { $("out").textContent = exportText(); $("out").hidden = !$("out").hidden; } }, "Show the text")),
      el("p", { class: "status", id: "status", role: "status" }), el("pre", { id: "out", hidden: true }));
  }

  function exportText() {
    const L = [C.exportHeader || String(C.title || "decide").toUpperCase() + " ANSWERS"];
    const line = (t) => String(t || "").trim().replace(/\s+/g, " ");
    for (const s of STEPS) {
      if (s.kind === "end") continue;
      if (s.kind !== "q") {
        L.push("", s.h + " [" + s.id + "]");
        for (const it of s.items) { const on = S.seen[s.id] && S.a[s.id].includes(it.id); L.push("→ " + (!S.seen[s.id] ? "Unanswered" : s.kind === "batch" ? (on ? "Accept" : "Talk about") : on ? "Selected" : "Not selected") + ": " + line(it.name || it.text) + (it.after ? ". " + line(it.after) : "") + " [" + it.id + "]"); }
        continue;
      }
      const o = picked(s), r = s.options.find((x) => x.id === s.rec);
      L.push("", s.h + " [" + s.id + (o && shown(s) ? " = " + o.id : "") + "]");
      if (!shown(s)) { L.push("→ Skipped: an earlier answer settled it"); continue; }
      L.push(o ? "→ " + o.name + (o.does ? ": " + line(o.does) : "") + (r ? (o === r ? " (as recommended)" : " (recommended: " + r.name + ")") : "") + (o.permanent ? " PERMANENT: confirm first." : "") : S.u[s.id] ? "→ Not sure" : "→ Unanswered");
      if (line(S.n[s.id])) L.push("Note: " + line(S.n[s.id]));
    }
    return L.join("\n");
  }

  function copy() {
    const pre = $("out"), status = $("status"), text = exportText();
    pre.textContent = text;
    const fail = () => { pre.hidden = false; const r = document.createRange(); r.selectNodeContents(pre); const x = getSelection(); x.removeAllRanges(); x.addRange(r); status.textContent = "Copying was blocked. The text is selected: press Cmd+C or Ctrl+C."; };
    try { navigator.clipboard.writeText(text).then(() => { status.textContent = "Copied. Paste it into the chat."; }, fail); } catch (e) { fail(); }
  }

  function acceptAll() {
    for (const s of STEPS) {
      const r = s.kind === "q" && s.options.find((o) => o.id === s.rec);
      if (r && !r.permanent && shown(s) && !picked(s) && !S.u[s.id]) S.a[s.id] = r.id;
    }
    go(visible().length - 1);
  }

  function next() {
    const list = visible(), s = list[S.at];
    if (!s || s.kind === "end" || !ready(s)) return;
    S.seen[s.id] = true; save();
    if (single) { copy(); return; }
    if (!returning) { go(S.at + 1); return; }
    returning = false;
    const now = visible(), gap = now.findIndex((x) => x.kind === "q" && !ready(x));
    go(gap >= 0 ? gap : now.length - 1);
  }

  function foot(s) {
    const f = $("foot"), had = document.activeElement && document.activeElement.id;
    f.hidden = s.kind === "end";
    f.replaceChildren();
    if (f.hidden) return;
    if (s.kind === "q") f.append(
      el("button", { class: "link unsure", id: "unsure", type: "button", "aria-pressed": String(!!S.u[s.id]), onclick: () => { if (S.u[s.id]) delete S.u[s.id]; else { S.u[s.id] = true; delete S.a[s.id]; view.querySelectorAll(".opt input").forEach((i) => { i.checked = false; }); } save(); foot(s); } }, T.unsure),
      el("button", { class: "link", id: "addnote", type: "button", onclick: () => { $("note").hidden = false; $("notetext").focus(); } }, T.addNote));
    if (S.at === 0 && !single && STEPS.some((x) => x.kind === "q" && x.rec)) f.append(el("button", { class: "link", id: "acceptall", type: "button", onclick: acceptAll }, T.acceptAll));
    const label = single ? T.copyOne : s.kind === "batch" ? "Accept " + S.a[s.id].length + " of " + s.items.length : returning ? "Save" : T.next;
    const b = el("button", { class: "btn", id: "next", type: "button", onclick: next }, label, el("span", { class: "kbd", "aria-hidden": "true", text: "Enter" }));
    b.disabled = !ready(s);
    f.append(b);
    if (had && $(had) && f.contains($(had))) $(had).focus();
  }

  function go(i) { S.at = Math.max(0, Math.min(visible().length - 1, i)); save(); render(); window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  function render() {
    const list = visible();
    S.at = Math.max(0, Math.min(list.length - 1, Number(S.at) || 0));
    const s = list[S.at], total = list.filter((x) => x.kind !== "end").length;
    view.replaceChildren();
    $("back").style.visibility = S.at ? "visible" : "hidden";
    $("where").textContent = single ? "" : s.kind === "end" ? "Done" : (groups.length > 1 && s.g ? (s.g.label || s.g.id) + " · " : "") + (S.at + 1) + " of " + total;
    $("app").className = "app " + hue(s);
    $("bar").replaceChildren(...(single ? [] : list.filter((x) => x.kind !== "end").map((x, i) => el("i", { class: hue(x) + (i <= S.at ? " seen" : "") }))));
    if (s.kind === "end") viewEnd(s); else if (s.kind === "q") viewQuestion(s); else viewList(s);
    foot(s);
  }

  $("back").addEventListener("click", () => { returning = false; go(S.at - 1); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("textarea, button, summary")) return;
    const s = visible()[S.at];
    const i = s.kind === "q" && /^[1-9]$/.test(e.key) ? $(dom(s) + "-" + (Number(e.key) - 1)) : null;
    if (i) { i.checked = true; i.dispatchEvent(new Event("change")); i.focus({ preventScroll: true }); }
    else if (e.key === "Enter") { e.preventDefault(); next(); }
  });
  render();
})();
