// decide: one decision per screen, a Today | Change picture for each, group approvals, extras, and a check-answers summary.
// Everything specific to one review comes from CONFIG (see references/format.md). Answers live in localStorage
// and leave the page only through "Copy answers".
(() => {
  const C = CONFIG;
  const W = C.wording || {};
  const DEFAULT_CHOICES = {
    keep: { label: "Keep it as it is", goes: [["You get the ", "Today", " picture."]], side: "today" },
    change: { label: "Change it", goes: [["You get the ", "Change", " picture."]], side: "after" },
    docs: { label: "Keep it, fix the docs or wording", goes: [["It stays as in ", "Today", ". Only the wording changes."]], side: "today" },
    unsure: { label: "Not sure. Let's talk about it", goes: [["Nothing is decided. We go through it together."]], side: null },
  };
  const CHOICE_KEYS = C.choices || ["keep", "change", "docs", "unsure"];
  const CHOICES = Object.fromEntries(CHOICE_KEYS.map((k) => [k, { ...DEFAULT_CHOICES[k], ...((W.choices || {})[k] || {}) }]));
  const label = (k) => (CHOICES[k] ? CHOICES[k].label : k);
  const T = {
    todayBadge: "Today", changeBadge: "Change", todayTitle: "Keep it", changeTitle: "Change it",
    why: "Why it matters", rec: "My recommendation: ", legend: "What should I do?", recommended: "Recommended",
    noteLabel: "Note (optional)", noteHint: "What you want instead, or why.",
    start: "Start now", resume: "Continue where you left off", acceptAll: "Accept all my recommendations and only check the summary",
    safety: "Answers save in this browser as you go, so you can stop and come back. Nothing changes until you paste your answers and I act on them.",
    send: "Copy your answers and paste them into the chat. Then tell me you're done.",
    ...W,
  };

  const KEY = C.storageKey || "decide-" + String(C.title || "review").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let S = { step: 0, q: {}, g: {}, x: {}, from: null };
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); document.getElementById("saved").textContent = "Saved in this browser"; }
    catch (e) { document.getElementById("saved").textContent = ""; }
  };

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    for (const k of kids) if (k != null && k !== false) n.append(k);
    return n;
  };
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");

  const GROUPS = C.groups || [{ id: "all" }];
  const QS = (C.questions || []).map((q) => ({ ...q, group: q.group || GROUPS[0].id }));
  const EXTRAS = C.extras && (C.extras.items || []).length ? C.extras : null;
  const STEPS = [{ kind: "start" }];
  for (const g of GROUPS) {
    for (const q of QS.filter((x) => x.group === g.id)) STEPS.push({ kind: "q", q, g });
    if (g.review) STEPS.push({ kind: "group", g });
  }
  if (EXTRAS) STEPS.push({ kind: "extras" });
  STEPS.push({ kind: "check" });
  const REVIEWED = GROUPS.filter((g) => g.review);
  // A rebuild can change the number of steps; never resume past the end.
  S.step = Math.max(0, Math.min(STEPS.length - 1, Number(S.step) || 0));
  if (S.from != null && !(S.from >= 0 && S.from < STEPS.length)) S.from = null;
  const showGroupCaption = GROUPS.length > 1;
  const view = document.getElementById("view");

  function go(i, from) {
    S.step = Math.max(0, Math.min(STEPS.length - 1, i));
    if (from !== undefined) S.from = from;
    save(); render();
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
  function next() {
    if (S.from != null) { const b = S.from; S.from = null; go(b); return; }
    go(S.step + 1);
  }
  const submitLabel = () => (S.from != null ? "Save and go back" : "Continue");

  function backLink() {
    const slot = document.getElementById("backslot");
    slot.replaceChildren();
    if (S.step === 0) return;
    slot.append(el("a", { class: "back", href: "#", onclick: (e) => { e.preventDefault(); if (S.from != null) { const b = S.from; S.from = null; go(b); } else go(S.step - 1); } }, "Back"));
  }

  function radioRow(name, value, title, desc, checked, onPick, tag, key) {
    const id = name + "-" + value;
    const input = el("input", { type: "radio", name, value, id });
    input.checked = checked;
    input.addEventListener("change", onPick);
    return el("label", { class: "opt", for: id }, input,
      el("span", {}, el("span", { class: "t" }, title, tag ? el("span", { class: "tag", text: tag }) : null),
        desc instanceof Node ? desc : desc ? el("span", { class: "d", text: desc }) : null,
        key ? el("span", { class: "key", text: "Key " + key }) : null));
  }

  function noteField(id, lbl, hint, value, onInput) {
    const ta = el("textarea", { id: id + "-note", rows: "2", "aria-describedby": id + "-hint" });
    ta.value = value || "";
    ta.addEventListener("input", () => onInput(ta.value));
    return el("div", { class: "field" }, el("label", { for: id + "-note", text: lbl }), el("span", { class: "hint", id: id + "-hint", text: hint }), ta);
  }

  // ---------- start ----------
  function viewStart() {
    const answered = QS.filter((q) => (S.q[q.id] || {}).choice).length;
    const facts = [[QS.length, QS.length === 1 ? "question" : "questions"]];
    if (REVIEWED.length) facts.push([REVIEWED.length, (C.groupNoun || "group") + (REVIEWED.length === 1 ? "" : "s") + " to approve"]);
    facts.push(["~" + (C.minutes || Math.max(2, Math.round(QS.length * 0.25 + REVIEWED.length * 0.5))) + " min", "to finish"]);
    const steps = [el("li", {}, el("b", { text: "Answer one question at a time." }), " Each shows what happens today, what a change would look like, and my recommendation.")];
    if (REVIEWED.length) steps.push(el("li", {}, el("b", { text: "Approve each " + (C.groupNoun || "group") + "." }), " Or name the parts you want to read first."));
    if (EXTRAS) steps.push(el("li", {}, el("b", { text: EXTRAS.startStep || EXTRAS.heading })));
    steps.push(el("li", {}, el("b", { text: "Check your answers, then copy them into the chat." })));
    view.append(
      C.eyebrow ? el("span", { class: "caption", text: C.eyebrow }) : null,
      el("h1", { text: C.heading || C.title }),
      C.intro ? el("p", { class: "lede", text: C.intro }) : null,
      el("ul", { class: "facts" }, ...facts.map(([v, l]) => el("li", {}, el("b", { text: String(v) }), el("span", { text: l })))),
      el("h2", { text: "What you will do" }),
      el("ol", { class: "steps" }, ...steps),
      el("p", { class: "inset", text: T.safety }),
      el("div", { class: "buttons" },
        el("button", { class: "btn", type: "button", onclick: () => go(firstOpen()) }, answered ? T.resume : T.start),
        QS.some((q) => q.rec) ? el("button", { class: "linkbtn", type: "button", onclick: acceptAll }, T.acceptAll) : null));
  }
  function firstOpen() {
    const i = STEPS.findIndex((s, k) => k > 0 && ((s.kind === "q" && !(S.q[s.q.id] || {}).choice) || (s.kind === "group" && !(S.g[s.g.id] || {}).verdict)));
    return i < 0 ? STEPS.length - 1 : i;
  }
  function acceptAll() {
    for (const q of QS) if (!(S.q[q.id] || {}).choice && q.rec) S.q[q.id] = { ...(S.q[q.id] || {}), choice: q.rec };
    go(STEPS.length - 1);
  }

  // ---------- pictures ----------
  function renderPanel(p) {
    if (!p) return null;
    if (p.kind === "terminal") {
      const box = el("div", { class: "term", role: "img", "aria-label": "Terminal: " + (p.lines || []).map((l) => l.t).join(". ") },
        el("div", { class: "bar", "aria-hidden": "true" }, el("i"), el("i"), el("i")),
        ...(p.lines || []).map((l) => el("div", { class: "ln " + (l.tone || "out"), text: l.t })));
      if (p.exit != null) box.append(el("div", { class: "exit" }, "exit code ", el("b", { class: p.exit ? "bad" : "", text: String(p.exit) })));
      return box;
    }
    if (p.kind === "file") {
      return el("div", { class: "file", role: "img", "aria-label": "File " + (p.name || "") + ": " + (p.lines || []).map((l) => (l.tone === "add" ? "added " : l.tone === "del" ? "removed " : "") + l.t).join(". ") },
        el("div", { class: "fname", text: p.name || "" }),
        el("div", { class: "body" }, ...(p.lines || []).map((l) => el("div", { class: "ln " + (l.tone || "out"), text: l.t }))));
    }
    if (p.kind === "steps") {
      const words = { ok: "done", fail: "failed", stuck: "stuck", now: "current" };
      return el("div", {},
        el("ol", { class: "flow" }, ...(p.steps || []).map((s) => el("li", {}, el("span", { class: "st " + (s.state || "ok") }, s.label, el("span", { class: "sr", text: " (" + (words[s.state] || "") + ")" }))))),
        p.note ? el("p", { class: "flownote", text: p.note }) : null);
    }
    return null;
  }

  function compare(q) {
    const v = q.visual || {};
    const recSide = q.rec && CHOICES[q.rec] ? CHOICES[q.rec].side : null;
    const side = (cls, badge, title, say, panel, isRec) => el("section", { class: "side " + cls, "aria-label": title },
      el("div", { class: "head" },
        el("span", { class: "who" }, el("span", { class: "badge", text: badge }), title, isRec ? el("span", { class: "tag", text: T.recommended }) : null),
        say ? el("p", { class: "say", text: say }) : null),
      el("div", { class: "pic" }, renderPanel(panel)));
    return el("div", { class: "compare", id: "compare" },
      side("today", T.todayBadge, T.todayTitle, q.today, v.today, recSide === "today"),
      side("after", T.changeBadge, T.changeTitle, q.change, v.after, recSide === "after"));
  }

  function lightSide(choice) {
    const c = document.getElementById("compare");
    if (!c) return;
    const s = choice && CHOICES[choice] ? CHOICES[choice].side : null;
    const t = c.querySelector(".today"), a = c.querySelector(".after");
    t.classList.toggle("lit", s === "today"); a.classList.toggle("lit", s === "after");
    t.classList.toggle("dim", s === "after"); a.classList.toggle("dim", s === "today");
  }

  function goesLine(spec) {
    const span = el("span", { class: "goes" });
    for (const part of spec) {
      if (typeof part === "string") span.append(part);
      else part.forEach((bit, i) => span.append(i === 1 ? el("b", { text: bit }) : bit));
    }
    return span;
  }

  // ---------- question ----------
  function viewQuestion({ q, g }) {
    const cur = S.q[q.id] || {};
    const name = "q-" + String(q.id).replace(/[^A-Za-z0-9]/g, "-");
    const pick = (val) => () => { S.q[q.id] = { ...(S.q[q.id] || {}), choice: val }; save(); lightSide(val); };
    const idx = QS.indexOf(q) + 1;
    const goes = { ...Object.fromEntries(CHOICE_KEYS.map((k) => [k, CHOICES[k].goes])), ...(q.goes ? Object.fromEntries(Object.entries(q.goes).map(([k, v]) => [k, [[v]]])) : {}) };
    view.append(
      el("span", { class: "caption" }, (showGroupCaption ? (g.label || g.id) + " · " : "") + "Question " + idx + " of " + QS.length),
      el("h1", { text: q.h }),
      q.visual && q.visual.caption ? el("p", { class: "vcap", text: q.visual.caption }) : null,
      compare(q),
      q.why ? el("div", { class: "block" }, el("span", { class: "label", text: T.why }), el("p", { text: q.why })) : null,
      q.rec ? el("div", { class: "block recbox" }, el("span", { class: "label", text: T.rec + label(q.rec) }), q.recWhy ? el("p", { text: q.recWhy }) : null) : null,
      el("form", { onsubmit: (e) => { e.preventDefault(); next(); } },
        el("fieldset", {}, el("legend", { text: q.legend || T.legend }),
          el("div", { class: "opts" }, ...CHOICE_KEYS.map((k, i) => radioRow(name, k, label(k), goesLine(goes[k] || []), cur.choice === k, pick(k), q.rec === k ? T.recommended : null, String(i + 1))))),
        noteField(name, T.noteLabel, T.noteHint, cur.note, (val) => { S.q[q.id] = { ...(S.q[q.id] || {}), note: val }; save(); }),
        q.ref ? el("p", { class: "hint" }, el("span", { class: "id", text: q.id }), " · " + q.ref) : null,
        el("div", { class: "buttons" }, el("button", { class: "btn", type: "submit" }, submitLabel()),
          el("button", { class: "linkbtn", type: "button", onclick: () => go(STEPS.length - 1) }, "Go to the summary"))));
  }

  // ---------- group approval ----------
  const GROUP_OPTS = (g) => g.review.options || [
    ["approve", "Yes, approve it", "Everything in it counts as confirmed."],
    ["look", "Mostly, but I want to read some parts with you first", "Name them below. I confirm the rest."],
    ["hold", "Not yet", "I leave it as it is for now."],
  ];
  function viewGroup({ g }) {
    const r = g.review;
    const cur = S.g[g.id] || {};
    const name = "g-" + String(g.id).replace(/[^A-Za-z0-9]/g, "-");
    const items = r.items || [];
    view.append(
      el("span", { class: "caption" }, (C.groupNounTitle || "Group") + " " + (REVIEWED.indexOf(g) + 1) + " of " + REVIEWED.length),
      el("h1", { text: r.heading || "Is " + (g.label || g.id) + " right?" }),
      g.summary ? el("p", { class: "lede", text: g.summary }) : null,
      r.intro ? el("p", { text: r.intro }) : null,
      items.length ? el("ul", { class: "itemlist" }, ...items.map((it) => el("li", {}, el("details", {},
        el("summary", {}, el("span", { class: "t", text: it.title }), it.count ? el("span", { class: "n", text: it.count }) : el("span")),
        el("div", { class: "itembody" },
          it.intro ? el("p", { text: it.intro }) : null,
          (it.details || []).length ? el("ul", {}, ...it.details.map((d) => el("li", {}, d.id ? el("span", { class: "id", text: d.id + " " }) : null, d.text))) : null,
          it.ref ? el("p", { class: "hint", style: "margin-top:0.6rem" }, el("span", { class: "id", text: it.ref })) : null))))) : null,
      el("form", { onsubmit: (e) => { e.preventDefault(); next(); } },
        el("fieldset", {}, el("legend", { text: r.legend || "Should I approve it?" }),
          el("div", { class: "opts" }, ...GROUP_OPTS(g).map(([v, t, d], i) => radioRow(name, v, t, d, cur.verdict === v, () => { S.g[g.id] = { ...(S.g[g.id] || {}), verdict: v }; save(); }, null, String(i + 1))))),
        noteField(name, r.noteLabel || "Parts to read first, or anything else (optional)", items.length ? "For example: \"" + items[0].title + "\"." : "Anything I should know.", cur.note, (val) => { S.g[g.id] = { ...(S.g[g.id] || {}), note: val }; save(); }),
        el("div", { class: "buttons" }, el("button", { class: "btn", type: "submit" }, submitLabel()))));
  }

  // ---------- extras (pick-any list) ----------
  const extraOn = (it) => (S.x[it.id] !== undefined ? S.x[it.id] : it.default !== false);
  function viewExtras() {
    view.append(
      el("span", { class: "caption", text: EXTRAS.caption || "Almost done" }),
      el("h1", { text: EXTRAS.heading }),
      EXTRAS.intro ? el("p", { text: EXTRAS.intro }) : null,
      el("form", { onsubmit: (e) => { e.preventDefault(); next(); } },
        el("fieldset", {}, el("legend", { text: EXTRAS.legend || "Select all that apply" }),
          ...EXTRAS.items.map((it, i) => {
            const id = "x-" + i;
            const cb = el("input", { type: "checkbox", id });
            cb.checked = extraOn(it);
            cb.addEventListener("change", () => { S.x[it.id] = cb.checked; save(); });
            return el("label", { class: "checkrow", for: id }, cb, el("span", {}, el("span", { class: "t", text: it.text }), el("span", { class: "hint", text: it.id })));
          })),
        el("div", { class: "buttons" }, el("button", { class: "btn", type: "submit" }, submitLabel()))));
  }

  // ---------- check answers ----------
  function answerText(q) {
    const a = S.q[q.id] || {};
    if (!a.choice) return null;
    return label(a.choice) + (CHOICES[a.choice] && CHOICES[a.choice].side === "after" && q.change ? ": " + q.change : "");
  }
  const changeLink = (step, what) => el("a", { class: "chg", href: "#", onclick: (e) => { e.preventDefault(); go(step, S.step); } }, "Change", el("span", { class: "sr", text: " " + what }));

  function viewCheck() {
    const open = QS.filter((q) => !(S.q[q.id] || {}).choice).length;
    const openG = REVIEWED.filter((g) => !(S.g[g.id] || {}).verdict).length;
    const differs = QS.filter((q) => { const c = (S.q[q.id] || {}).choice; return c && q.rec && c !== q.rec; }).length;
    const missing = [open ? plural(open, "question") : null, openG ? plural(openG, C.groupNoun || "group") : null].filter(Boolean).join(" and ");
    view.append(
      el("h1", { text: "Check your answers" }),
      el("p", { class: "lede" }, missing ? missing + " still " + (open + openG === 1 ? "has" : "have") + " no answer. You can send them anyway; I will treat them as \"not sure\"." : el("span", { class: "count-ok", text: "Everything has an answer." })),
      differs ? el("p", { text: plural(differs, "answer") + (differs === 1 ? " differs" : " differ") + " from my recommendation. " + (differs === 1 ? "It is" : "They are") + " marked below." }) : null);

    for (const g of GROUPS) {
      const qs = QS.filter((x) => x.group === g.id);
      if (!qs.length && !g.review) continue;
      if (showGroupCaption) view.append(el("h2", { text: g.label || g.id }));
      const list = el("div", { class: "summary" });
      for (const q of qs) {
        const a = S.q[q.id] || {};
        const txt = answerText(q);
        list.append(el("div", { class: "row" },
          el("span", { class: "q", text: q.h }),
          changeLink(STEPS.findIndex((s) => s.kind === "q" && s.q === q), "answer to: " + q.h),
          el("span", { class: "a" + (txt ? "" : " none") }, txt || "Not answered", txt && q.rec && a.choice !== q.rec ? el("span", { class: "diff", text: "not my recommendation" }) : null),
          a.note && a.note.trim() ? el("span", { class: "note", text: "Note: " + a.note.trim() }) : null));
      }
      if (g.review) {
        const gv = S.g[g.id] || {};
        const opt = GROUP_OPTS(g).find((o) => o[0] === gv.verdict);
        list.append(el("div", { class: "row" },
          el("span", { class: "q", text: g.review.summaryLabel || "Approve " + (g.label || g.id) + "?" }),
          changeLink(STEPS.findIndex((s) => s.kind === "group" && s.g === g), "answer for " + (g.label || g.id)),
          el("span", { class: "a" + (opt ? "" : " none") }, opt ? opt[1] : "Not answered"),
          gv.note && gv.note.trim() ? el("span", { class: "note", text: "Note: " + gv.note.trim() }) : null));
      }
      view.append(list);
    }

    if (EXTRAS) {
      const on = EXTRAS.items.filter(extraOn);
      view.append(el("h2", { text: EXTRAS.summaryHeading || EXTRAS.heading }), el("div", { class: "summary" }, el("div", { class: "row" },
        el("span", { class: "q", text: on.length + " of " + EXTRAS.items.length + " selected" }),
        changeLink(STEPS.findIndex((s) => s.kind === "extras"), EXTRAS.heading),
        el("span", { class: "a", text: on.map((it) => it.text).join(" ") || "None" }))));
    }

    const pre = el("pre", { class: "out", id: "out" });
    const status = el("div", { class: "status", role: "status" });
    view.append(
      el("h2", { text: "Send your answers" }),
      el("p", { text: T.send }),
      el("div", { class: "buttons" }, el("button", { class: "btn", type: "button", onclick: () => copy(pre, status) }, "Copy answers"),
        el("button", { class: "linkbtn", type: "button", onclick: () => { pre.hidden = !pre.hidden; } }, "Show the text")),
      status, pre);
    pre.textContent = exportText();
    pre.hidden = true;
  }

  function exportText() {
    const clean = (s) => (s && s.trim() ? " | " + s.trim().replace(/\s+/g, " ") : "");
    const L = [(C.exportHeader || (C.title || "DECIDE").toUpperCase() + " ANSWERS")];
    for (const g of GROUPS) {
      const qs = QS.filter((x) => x.group === g.id);
      if (!qs.length && !g.review) continue;
      const gv = S.g[g.id] || {};
      L.push("", "## " + g.id + (g.review ? ": " + (gv.verdict || "unanswered") + clean(gv.note) : ""));
      for (const q of qs) {
        const a = S.q[q.id] || {};
        const tag = a.choice ? a.choice + (q.rec ? (a.choice === q.rec ? " (=rec)" : " (rec " + q.rec + ")") : "") : "unanswered";
        L.push(q.id + ": " + tag + clean(a.note));
      }
    }
    if (EXTRAS) L.push("", "## " + (EXTRAS.exportLabel || "selected") + ": " + (EXTRAS.items.filter(extraOn).map((it) => it.id).join("; ") || "none"));
    return L.join("\n");
  }

  function copy(pre, status) {
    const text = exportText();
    pre.textContent = text;
    const fallback = () => {
      pre.hidden = false;
      const r = document.createRange(); r.selectNodeContents(pre);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      status.textContent = "This browser blocked copying. The text is selected below: press Cmd+C or Ctrl+C.";
    };
    try { navigator.clipboard.writeText(text).then(() => { status.textContent = "Copied. Paste it into the chat."; }, fallback); } catch (e) { fallback(); }
  }

  function render() {
    view.replaceChildren();
    backLink();
    const s = STEPS[S.step] || STEPS[0];
    if (s.kind === "start") viewStart();
    else if (s.kind === "q") { viewQuestion(s); lightSide((S.q[s.q.id] || {}).choice); }
    else if (s.kind === "group") viewGroup(s);
    else if (s.kind === "extras") viewExtras();
    else viewCheck();
    document.title = (s.kind === "q" ? "Question " + (QS.indexOf(s.q) + 1) + " of " + QS.length + " · " : "") + (C.title || "Review");
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("textarea")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const radios = view.querySelectorAll('input[type="radio"]');
      if (radios[n - 1]) { radios[n - 1].checked = true; radios[n - 1].dispatchEvent(new Event("change")); radios[n - 1].focus(); }
    }
  });

  render();
})();
