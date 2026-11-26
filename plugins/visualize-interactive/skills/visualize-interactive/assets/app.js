// visualize-interactive: the storyboard, where clicking any part opens a comment to ask about it.
(() => {
  const C = CONFIG, F = C.frames.map((f, i) => ({ ...f, n: i + 1 })), $ = (i) => document.getElementById(i), view = $("view"), pop = $("pop");
  const put = (n, p, k) => {
    for (const [a, v] of Object.entries(p || {})) { if (v == null || v === false) continue; if (a === "text") n.textContent = v; else if (a.startsWith("on")) n.addEventListener(a.slice(2), v); else n.setAttribute(a, v === true ? "" : v); }
    n.append(...k.flat(4).filter((x) => x != null && x !== false));
    return n;
  };
  const el = (t, p, ...k) => put(document.createElement(t), p, k);
  const svg = (t, p, ...k) => put(document.createElementNS("http://www.w3.org/2000/svg", t), p, k);
  const code = (s) => String(s).split("`").map((x, i) => (i % 2 ? el("code", { text: x }) : x));
  const rich = (s) => String(s).split("**").map((x, i) => (i % 2 ? el("mark", {}, code(x)) : code(x)));
  const squash = (t) => String(t).replace(/\s+/g, " ").trim();
  const state = {}, threads = [];
  let at = 0, cur = null;

  // ---------- saved comments ----------
  let rev = C.saved.rev, saving = false, dirty = false, unsaved = "";
  // A step someone edited keeps its comments: by heading, else by number.
  const stepOf = (t) => { const same = F.find((f) => f.id === t.step); if (same) return [same, false]; return [F.find((f) => f.heading === t.heading) || F.find((f) => f.n === Math.min(t.n, C.frames.length)), true]; };
  for (const a of C.saved.added) { const before = F.find((f) => f.id === a.after), i = before ? F.indexOf(before) : F.findIndex((f) => f.n === Math.min(a.n, C.frames.length)); F.splice(i + 1, 0, { ...a.frame, added: true, id: a.id }); }
  for (const s of C.saved.threads) { const [frame, moved] = stepOf(s), { step, n, heading, ...t } = s; threads.push({ ...t, spot: t.spot ?? undefined, chart: t.chart ?? undefined, frame, moved, drawn: F.find((f) => f.added && f.id === t.drawn) || null }); }
  async function save() {
    dirty = true;
    if (saving) return;
    saving = true;
    while (dirty) {
      dirty = false;
      const added = F.filter((f) => f.added).map((f) => ({ id: f.id, after: F[F.indexOf(f) - 1].id, n: stepNo(f), frame: f }));
      const kept = threads.map((t) => ({ step: t.frame.id, n: stepNo(t.frame), heading: t.frame.heading, spot: t.spot, chart: t.chart, fx: t.fx, fy: t.fy, about: t.about, exact: t.exact, on: t.on, quote: t.quote, seen: t.seen, drawn: t.drawn && t.drawn.id, msgs: t.msgs.filter((m) => m.done || m.note) }));
      try {
        const r = await fetch("/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rev, added, threads: kept }) });
        if (!r.ok) throw new Error(await r.text());
        rev = (await r.json()).rev; unsaved = "";
      } catch (e) { unsaved = e instanceof TypeError ? "Not saved: the local helper is not running. Start it again from the terminal, then reload." : "Not saved. " + e.message; }
    }
    saving = false;
    if (cur) fill();
  }

  // ---------- pictures ----------
  const ticks = (a, b) => { const raw = (b - a) / 5, p = 10 ** Math.floor(Math.log10(raw)), s = [1, 2, 5, 10].find((m) => m * p >= raw) * p, o = []; for (let v = Math.ceil(a / s) * s; v <= b + s * 1e-9; v += s) o.push(Number(v.toPrecision(12))); return o; };
  function chart({ label, x: [X0, X1], y: [Y0, Y1], series, notes = [] }) {
    const W = 760, H = 400, l = 62, b = 42, x = (v) => l + ((v - X0) / (X1 - X0)) * (W - l - 24), y = (v) => H - b - ((v - Y0) / (Y1 - Y0)) * (H - b - 16);
    const g = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label });
    for (const v of ticks(Y0, Y1)) g.append(svg("line", { class: "gl", x1: l, x2: W - 24, y1: y(v), y2: y(v) }), svg("text", { x: l - 9, y: y(v) + 6, "text-anchor": "end", "font-size": 17, class: "tick", text: v.toLocaleString("en") }));
    for (const v of ticks(X0, X1)) g.append(svg("text", { x: x(v), y: H - 12, "text-anchor": "middle", "font-size": 17, class: "tick", text: v.toLocaleString("en", { useGrouping: X1 < 1800 || X1 > 2200 }) }));
    g.append(svg("line", { class: "ax", x1: l, x2: W - 24, y1: y(Y0), y2: y(Y0) }));
    for (const s of series) {
      const pts = s.step ? s.points.flatMap((p, i) => (i ? [[p[0], s.points[i - 1][1]], p] : [p])) : s.points;
      g.append(svg("path", { class: s.style === "ink" ? "linea" : "lineh", d: "M" + pts.map(([u, v]) => x(u).toFixed(1) + " " + y(Math.min(Y1, Math.max(Y0, v))).toFixed(1)).join("L") }));
    }
    for (const n of notes) g.append(svg("text", { x: x(n.x), y: y(n.y), "font-size": 20, "font-weight": 700, style: n.color ? "fill: var(--i)" : null, text: n.t }));
    // The nearest point on a drawn line, with the exact value there and on the other lines.
    const num = (v) => Number(v.toPrecision(4)).toLocaleString("en"), nameOf = (s, i) => s.name || (series.length > 1 ? "line " + (i + 1) : "the line");
    const valueAt = (s, u) => { const p = s.points; if (u < p[0][0] || u > p[p.length - 1][0]) return null; let i = 1; while (i < p.length - 1 && p[i][0] < u) i++; const [a, c] = [p[i - 1], p[i]]; return s.step ? (u >= c[0] ? c[1] : a[1]) : c[0] === a[0] ? c[1] : a[1] + ((c[1] - a[1]) * (u - a[0])) / (c[0] - a[0]); };
    g.nearest = (px, py) => {
      let best = null;
      series.forEach((s, i) => {
        const pts = s.step ? s.points.flatMap((p, k) => (k ? [[p[0], s.points[k - 1][1]], p] : [p])) : s.points;
        for (let k = 1; k < pts.length; k++) {
          const ax = x(pts[k - 1][0]), ay = y(pts[k - 1][1]), dx = x(pts[k][0]) - ax, dy = y(pts[k][1]) - ay, len = dx * dx + dy * dy, f = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0, d = Math.hypot(px - ax - f * dx, py - ay - f * dy);
          if (!best || d < best.d) best = { d, x: ax + f * dx, y: ay + f * dy, s, i, u: pts[k - 1][0] + f * (pts[k][0] - pts[k - 1][0]) };
        }
      });
      if (!best || best.d > 24) return null;
      // Show and report whole numbers where the line is a staircase over whole numbers.
      const u = best.s.step ? Math.floor(best.u + 1e-6) : best.u, v = valueAt(best.s, u);
      const others = series.map((s, i) => [s, i]).filter(([s]) => s !== best.s).map(([s, i]) => [nameOf(s, i), valueAt(s, u)]).filter((o) => o[1] != null).map(([n, o]) => n + " = " + num(o));
      return { x: x(u), y: v == null ? best.y : y(v), about: nameOf(best.s, best.i) + " at x = " + num(u) + (v == null ? "" : ": " + num(v)), exact: others.length ? "At the same x: " + others.join("; ") + "." : "" };
    };
    return g;
  }
  const lines = (list) => list.map((l) => el("div", { class: "ln " + (l.tone || "out") }, { cmd: "$ ", add: "+ ", del: "− " }[l.tone] || "", l.t));
  const KINDS = {
    chart,
    grid: (p) => el("div", { class: "grid", style: "--n:" + (p.columns || 10) }, p.items.map((i) => el("span", { class: i.on ? "on" : null, text: i.t }))),
    bars: (p) => { const max = Math.max(1e-9, ...p.rows.map((r) => r.parts.reduce((a, c) => a + c, 0))); return el("div", { class: "bars" }, p.rows.map((r) => el("div", {}, el("span", { text: r.label }), el("span", { class: "b", "aria-hidden": "true" }, r.parts.map((v, i) => el("i", { class: (p.colors || [])[i], style: "width:" + (v / max) * 100 + "%" }))), el("span", { class: "n", text: r.note == null ? r.parts.join(" / ") : r.note })))); },
    flow: (p) => el("ol", { class: "flow" }, p.steps.map((s, i) => el("li", { class: s.on ? "on" : null }, el("b", { "aria-hidden": "true", text: i + 1 }), el("span", {}, el("strong", { text: s.t }), s.sub ? el("span", { text: s.sub }) : null)))),
    swap: (p) => el("div", { class: "swap" }, p.rows.map((r) => el("div", {}, el("span", { text: r.from }), el("em", { role: "img", "aria-label": "becomes", text: "→" }), el("span", { class: "new", text: r.to })))),
    compare: (p) => el("div", { class: "pair" }, [p.left, p.right].map((s) => el("div", {}, el("h2", { text: s.title }), draw(s.pic)))),
    terminal: (p) => el("div", { class: "term" }, lines(p.lines)),
    file: (p) => el("div", { class: "file" }, el("div", { class: "fname", text: p.name }), el("div", { class: "body" }, lines(p.lines))),
    status: (p) => el("div", { class: "facts" }, p.rows.map((r) => el("div", { class: "fact " + r.color }, el("span", { class: "pill", text: r.tag }), el("span", {}, el("b", { text: r.t }), r.sub ? el("span", { text: r.sub }) : null)))),
    custom: (p) => PICS[p.id]({ el, svg, chart, state: (state[p.id] ??= {}), rerender: (id) => { render(); if (id && $(id)) $(id).focus({ preventScroll: true }); } }),
  };
  function draw(p) { try { return KINDS[p.kind](p); } catch (e) { return el("p", { class: "cap", role: "alert", text: "This picture failed to draw: " + e.message }); } }

  // ---------- storyboard ----------
  const SPOTS = ".tell h1, .tell p, .tell .big, .grid > span, .bars > div, .flow > li, .swap > div, .fact, .ln, .pair h2, .fname, .cap, .show svg [data-ask], .show svg text:not(.tick)";
  const spots = () => [...view.querySelectorAll(SPOTS)], charts = () => [...view.querySelectorAll(".show svg")].filter((g) => g.nearest);
  // After an edit to the step, a pin goes to the part with the same words, else to the step's corner.
  function settle(t) {
    if (!t.moved) return;
    t.moved = false;
    if (t.chart != null) { if (!charts()[t.chart]) t.chart = undefined; }
    else { const i = spots().findIndex((n) => (t.quote ? squash(n.innerText).includes(t.about) : label(n) === t.about)); if (i >= 0) return void (t.spot = i); }
    if (t.chart == null) { t.spot = undefined; t.fx = 1; t.fy = 0; }
  }
  const anchor = (t) => (t.chart != null ? charts()[t.chart] : spots()[t.spot]);
  function go(i) { close(); at = Math.max(0, Math.min(F.length - 1, i)); render(); window.scrollTo(0, 0); $("fwd").focus({ preventScroll: true }); }
  function render() {
    const f = F[at], last = at === F.length - 1;
    document.title = C.title;
    view.replaceChildren(
      el("section", { class: "board " + f.color + (f.added ? " added" : ""), id: "board" },
        el("div", { class: "tell" }, el("span", { class: "no", text: f.added ? "From your question" : "Step " + f.n + " of " + C.frames.length }), el("h1", { text: f.heading }), el("p", {}, rich(f.say)), f.added ? el("button", { class: "remove", type: "button", onclick: () => { for (const t of threads) if (t.drawn === f) t.drawn = null; for (let i = threads.length; i--;) if (threads[i].frame === f) { threads[i].stop?.abort(); threads.splice(i, 1); } F.splice(at, 1); go(at - 1); save(); } }, "Remove this step") : null, f.big ? el("div", { class: "big" }, el("b", { text: f.big.value }), el("span", { text: f.big.label })) : null),
        el("div", { class: "show" }, el("div", { class: "fit" }, draw(f.pic)), f.caption ? el("p", { class: "cap", text: f.caption }) : null, el("p", { class: "src" }, f.src, last && (C.sources || []).length ? [". Sources: ", C.sources.map((s, i) => [i ? ", " : "", el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })])] : null)),
        el("div", { class: "pins", id: "pins" })),
      el("div", { class: "steps" }, el("button", { class: "ghost", type: "button", disabled: !at, onclick: () => go(at - 1) }, "‹ Back"), el("nav", { class: "nav", "aria-label": "Steps" }, F.map((x, n) => { const c = threads.filter((t) => t.frame === x && t.msgs.length).length; return el("button", { class: x.color + (n < at ? " seen" : "") + (x.added ? " extra" : ""), type: "button", "aria-current": String(n === at), "aria-label": (x.added ? "From your question: " : "Step " + x.n + ": ") + x.key + (c ? ", " + c + (c === 1 ? " comment" : " comments") : ""), onclick: () => go(n) }, x.key, c ? el("span", { class: "count", "aria-hidden": "true", text: c }) : null); })),
        el("button", { class: "go " + f.color, id: "fwd", type: "button", onclick: () => go(last ? 0 : at + 1) }, last ? "Start again" : "Next: " + F[at + 1].key + " ›")));
    $("app").className = "app " + f.color;
    spots().forEach((n) => { n.classList.add("spot"); if (!n.closest(".grid")) n.setAttribute("tabindex", "0"); });
    fit(); threads.forEach((t) => t.frame === f && settle(t)); pins();
  }
  // Size each panel's content to its panel: the largest scale that does not overflow. Panels scroll only if even the smallest is too big.
  function fit() {
    const tell = view.querySelector(".tell"), show = view.querySelector(".show"), box = view.querySelector(".fit");
    if (!tell) return;
    const largest = (lo, hi, set, over) => { set(hi); if (!over()) return; for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; set(mid); if (over()) hi = mid; else lo = mid; } set(lo); };
    const spills = (n) => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1;
    const small = innerWidth < 640 ? 0.78 : 0.6;
    largest(small, 1.1, (v) => tell.style.setProperty("--s", v), () => spills(tell));
    // A picture that is one drawing fills the space by itself; anything else is zoomed.
    const art = box.querySelectorAll("svg");
    box.classList.toggle("fill", art.length === 1 && (art[0].parentElement === box || art[0].parentElement.parentElement === box));
    if (box.classList.contains("fill")) box.style.removeProperty("--z");
    else largest(small, 1.2, (v) => box.style.setProperty("--z", v), () => spills(show) || spills(box));
  }

  // ---------- comments ----------
  const label = (n) => (n.getAttribute("data-ask") || (n.tagName === "text" ? "the label \"" + squash(n.textContent) + "\"" : squash(n.innerText))).slice(0, 300);
  // The point of a chart's line under the pointer, if any.
  function hotOf(g, cx, cy) {
    const m = g.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return g.nearest(p.x, p.y);
  }
  // A spot is remembered by its place on the page, so a redrawn picture keeps its pins.
  function spotOf(target, cx, cy) {
    const n = target.closest && target.closest(".spot");
    if (n) return { spot: spots().indexOf(n), fx: 1, fy: 0, about: label(n), on: n.matches(".on") ? true : n.closest(".grid") ? false : null };
    const g = cx != null && target.closest && target.closest("svg"), h = g && g.nearest ? hotOf(g, cx, cy) : null;
    return h ? { chart: charts().indexOf(g), fx: h.x / 760, fy: h.y / 400, about: h.about, exact: h.exact, on: null } : null;
  }
  function pointOf(t) {
    const n = anchor(t) || $("board");
    if (t.chart != null && n.getScreenCTM) { const p = new DOMPoint(t.fx * 760, t.fy * 400).matrixTransform(n.getScreenCTM()); return { x: p.x, y: p.y }; }
    const r = n.getBoundingClientRect();
    return { x: r.left + r.width * t.fx, y: r.top + r.height * t.fy, r };
  }
  function pins() {
    const box = $("pins"), b = $("board").getBoundingClientRect(), mine = threads.filter((t) => t.frame === F[at] && (t.msgs.length || t === cur));
    box.replaceChildren(...mine.map((t) => { const p = pointOf(t), num = threads.filter((x) => x.frame === t.frame && x.msgs.length).indexOf(t) + 1; return el("button", { type: "button", class: "pin" + (t.stop ? " busy" : "") + (t === cur ? " open" : ""), style: `left:${Math.max(14, Math.min(b.width - 14, p.x - b.left))}px;top:${Math.max(14, Math.min(b.height - 14, p.y - b.top))}px`, "aria-label": "Comment on " + t.about, onclick: (e) => { e.stopPropagation(); t === cur ? close() : open(t); } }, num || "+"); }));
    spots().forEach((n, i) => n.classList.toggle("picked", !!cur && cur.frame === F[at] && cur.chart == null && cur.spot === i));
  }
  function open(t, focusFrom) {
    if (cur && cur !== t) drop(cur);
    cur = t; t.from = focusFrom || t.from; pop.hidden = false; pins(); fill(); place();
    $("popq").focus({ preventScroll: true });
  }
  const drop = (t) => { if (!t.msgs.length) { const i = threads.indexOf(t); if (i >= 0) threads.splice(i, 1); } };
  function close() { if (!cur) return; const t = cur; cur = null; drop(t); pop.hidden = true; if ($("pins")) pins(); if (t.from && t.from.isConnected) t.from.focus({ preventScroll: true }); }
  function place() {
    if (!cur || pop.hidden) return;
    if (innerWidth < 640) { pop.style.left = pop.style.top = ""; return; }
    const p = pointOf(cur), w = pop.offsetWidth, h = pop.offsetHeight, gap = 18;
    const x = p.x + gap + w <= innerWidth - 8 ? p.x + gap : p.x - gap - w >= 8 ? p.x - gap - w : Math.max(8, innerWidth - w - 8);
    pop.style.left = x + scrollX + "px";
    pop.style.top = Math.max(8, Math.min(innerHeight - h - 8, p.y - 24)) + scrollY + "px";
  }
  const SRC = { story: ["teal", "From this story's checked notes"], web: ["violet", "From a web search, not checked"], general: ["blue", "General knowledge, not checked"], unsure: ["orange", "Not sure"] };
  function fill() {
    const t = cur;
    if (!t) return;
    const links = (s) => String(s).split(/(\[[^\]\n]{1,200}\]\(https:\/\/[^\s)]+\)|https:\/\/[^\s<>)\]]+)/).map((x, i) => { if (i % 2 === 0) return rich(x); const m = /^\[([^\]]+)\]\((.+)\)$/.exec(x); return el("a", { href: m ? m[2] : x, target: "_blank", rel: "noopener noreferrer", text: m ? m[1] : x }); });
    const list = $("poplist"), stick = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    $("popabout").textContent = t.about;
    list.replaceChildren(...t.msgs.map((m) => { const s = SRC[m.source]; return el("article", { class: "msg" }, el("p", { class: "mine", text: m.q }), s && m.done ? el("span", { class: "from " + s[0] }, s[1]) : null, m.text ? el("p", { class: "ans" }, links(m.text)) : null, m.done || m.error || (m.text && !m.wait) ? null : el("p", { class: "wait", text: m.wait || "Thinking…" }), m.error ? el("p", { class: "err", text: m.error }) : null); }));
    const lastDone = [...t.msgs].reverse().find((m) => m.done);
    $("popacts").replaceChildren(...(lastDone && !t.stop ? [
      C.helper.web && lastDone.source !== "web" && lastDone === t.msgs[t.msgs.length - 1] ? el("button", { type: "button", onclick: () => ask(t, lastDone.q, true) }, "Check the web") : null,
      lastDone.source !== "unsure" && !t.drawn ? el("button", { type: "button", onclick: () => drawIt(t, lastDone) }, "Show as a step") : null,
      el("button", { type: "button", onclick: (e) => copyOut(t, lastDone, e.currentTarget) }, "Ask the main agent"),
      el("button", { type: "button", onclick: () => { const i = threads.indexOf(t); cur = null; if (i >= 0) threads.splice(i, 1); pop.hidden = true; render(); save(); } }, "Delete"), unsaved ? el("p", { class: "err", role: "alert", text: unsaved }) : null].filter(Boolean) : []));
    $("popacts").hidden = !$("popacts").children.length;
    $("popq").placeholder = t.msgs.length ? "Ask more" : "Ask about this";
    $("popsend").textContent = t.stop ? "Stop" : "Ask";
    if (stick) list.scrollTop = list.scrollHeight;
    place();
  }
  const touch = (t) => { if (cur === t) fill(); if (t.frame === F[at]) pins(); };
  // The helper cannot see the page, so send what the picture says.
  function seen() {
    const pic = view.querySelector(".show"), d = pic.querySelector("svg[aria-label]"), on = [...pic.querySelectorAll(".grid .on")].map((x) => x.textContent);
    return squash((d ? d.getAttribute("aria-label") + " " : "") + (on.length ? "Highlighted: " + on.join(", ") + ". " : "") + pic.innerText).slice(0, 1200);
  }
  async function call(t, payload, on) {
    const stop = (t.stop = new AbortController());
    touch(t);
    try {
      const r = await fetch("/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: stop.signal });
      if (!r.ok) throw new Error(await r.text());
      const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
      for (let buf = "", done = false; !done;) {
        const x = await reader.read();
        done = x.done; buf += x.value || "";
        for (let n; (n = buf.indexOf("\n")) >= 0; buf = buf.slice(n + 1)) { const m = JSON.parse(buf.slice(0, n)); if (m.t === "error") throw new Error(m.error); on(m); }
      }
    } catch (e) { on({ t: "error", error: e.name === "AbortError" ? "Stopped." : e instanceof TypeError ? "The local helper is not running. Start it again from the terminal." : e.message }); }
    t.stop = null;
    touch(t);
    save();
  }
  const stepNo = (f) => { for (let i = F.indexOf(f); i >= 0; i--) if (F[i].n) return F[i].n; return 1; };
  function ask(t, q, web) {
    const m = { q: web ? "Check the web" : q, text: "", source: null }, first = !t.msgs.length;
    const past = t.msgs.filter((x) => x.done).map((x) => ({ q: x.q, a: x.text }));
    t.msgs.push(m);
    if (first) { const s = scrollY; render(); scrollTo(0, s); }
    call(t, { mode: "ask", q, web: !!web, step: stepNo(t.frame), about: t.about + (t.on == null ? "" : t.on ? " (highlighted in the picture)" : " (not highlighted in the picture)") + (t.exact ? ". " + t.exact : ""), seen: t.seen, past }, (e) => { if (e.t === "text") { m.text = e.text; m.wait = ""; } if (e.t === "wait") { m.wait = e.text; m.text = ""; } if (e.t === "source") m.source = e.source; if (e.t === "error") m.error = e.error; if (e.t === "done") m.done = true; touch(t); });
  }
  function drawIt(t, m) {
    const note = { q: "Show as a step", text: "" };
    t.msgs.push(note);
    call(t, { mode: "draw", q: m.q + " (about: " + t.about + ")", answer: m.text, step: stepNo(t.frame) }, (e) => {
      if (e.t === "frame") { const f = (t.drawn = { ...e.frame, added: true, id: "a" + Math.random().toString(36).slice(2, 12) }); F.splice(F.indexOf(t.frame) + 1, 0, f); note.text = "Added as the next step."; note.note = true; if (cur === t) { go(F.indexOf(f)); } else render(); }
      if (e.t === "error") note.error = e.error;
    });
  }
  function copyOut(t, m, b) {
    const text = "From the storyboard \"" + C.title + "\", step \"" + t.frame.heading + "\".\nAbout: " + t.about + "\nI asked: " + m.q + "\nThe small model answered: " + m.text + "\nPlease check this and explain it properly.";
    navigator.clipboard.writeText(text).then(() => { b.textContent = "Copied. Paste it in the chat"; }, () => { b.textContent = "Copying was blocked"; });
  }

  // ---------- events ----------
  const start = (s, from) => { const known = threads.find((t) => t.frame === F[at] && t.spot === s.spot && t.chart === s.chart && !s.quote && t.about === s.about && Math.abs(t.fx - s.fx) < 0.03 && Math.abs(t.fy - s.fy) < 0.05); if (known) return open(known, from); if (cur) drop(cur); const t = { frame: F[at], msgs: [], seen: seen(), ...s }; threads.push(t); cur = null; open(t, from); };
  view.addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, select, textarea")) return;
    const sel = getSelection(), quote = squash(sel);
    const host = quote.length > 2 && sel.anchorNode && view.contains(sel.anchorNode) ? (sel.anchorNode.parentElement || view).closest(".spot") : null;
    if (host) {
      const r = sel.getRangeAt(0).getBoundingClientRect(), b = host.getBoundingClientRect();
      start({ spot: spots().indexOf(host), fx: Math.min(1, (r.right - b.left) / b.width), fy: Math.max(0, (r.top - b.top) / b.height), about: quote.slice(0, 300), on: null, quote: true }, host);
      return;
    }
    const s = spotOf(e.target, e.clientX, e.clientY);
    if (s) start(s, e.target.closest(".spot"));
  });
  // Only what lights up can be clicked: anywhere else closes the popup.
  document.addEventListener("mousedown", (e) => { if (cur && !pop.contains(e.target) && !e.target.closest(".pin, .board button, .theme") && !spotOf(e.target, e.clientX, e.clientY)) close(); });
  let mark = null;
  view.addEventListener("mousemove", (e) => {
    const g = e.target.closest("svg"), h = g && g.nearest && !e.target.closest(".spot") ? hotOf(g, e.clientX, e.clientY) : null;
    if (mark) { mark.remove(); mark = null; }
    if (g && g.nearest) g.style.cursor = h ? "pointer" : "";
    if (!h) return;
    const right = h.x > 380;
    g.append((mark = svg("g", { class: "hot", "aria-hidden": "true" }, svg("circle", { cx: h.x, cy: h.y, r: 9 }), svg("text", { class: "tick", x: h.x + (right ? -16 : 16), y: Math.max(24, h.y - 14), "text-anchor": right ? "end" : "start", "font-size": 18, "font-weight": 700, text: h.about }))));
  });
  view.addEventListener("mouseleave", () => { if (mark) { mark.remove(); mark = null; } });
  $("popform").addEventListener("submit", (e) => { e.preventDefault(); if (!cur) return; if (cur.stop) { cur.stop.abort(); return; } const q = $("popq").value.trim(); if (!q) return; $("popq").value = ""; ask(cur, q); });
  $("popq").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (cur && !cur.stop) $("popform").requestSubmit(); } });
  $("popclose").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") return close();
    if (e.target.closest("input, textarea, select")) return;
    const s = e.key === "Enter" && e.target.classList && e.target.classList.contains("spot") ? spotOf(e.target) : null;
    if (s) { e.preventDefault(); return start(s, e.target); }
    const n = at + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);
    if (n !== at && F[n]) { e.preventDefault(); go(n); }
  });
  const refit = () => { fit(); pins(); place(); };
  addEventListener("resize", refit);
  // A panel scrolls only in very small windows; its pins and popup follow.
  view.addEventListener("scroll", () => { pins(); place(); }, true);
  if (document.fonts) document.fonts.ready.then(refit);
  $("ask").title = C.ask;
  $("ask").append(el("span", { text: "You asked: " }), C.ask);
  render();
})();
