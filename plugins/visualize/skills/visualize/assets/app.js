// visualize: a storyboard, one idea per step. Everything specific to one story comes from CONFIG and PICS.
(() => {
  const C = CONFIG, F = C.frames, $ = (i) => document.getElementById(i), view = $("view");
  const put = (n, p, k) => {
    for (const [a, v] of Object.entries(p || {})) { if (v == null || v === false) continue; if (a === "text") n.textContent = v; else if (a.startsWith("on")) n.addEventListener(a.slice(2), v); else n.setAttribute(a, v === true ? "" : v); }
    n.append(...k.flat(4).filter((x) => x != null && x !== false));
    return n;
  };
  const el = (t, p, ...k) => put(document.createElement(t), p, k);
  const svg = (t, p, ...k) => put(document.createElementNS("http://www.w3.org/2000/svg", t), p, k);
  const code = (s) => String(s).split("`").map((x, i) => (i % 2 ? el("code", { text: x }) : x));
  const rich = (s) => String(s).split("**").map((x, i) => (i % 2 ? el("mark", {}, code(x)) : code(x)));
  const state = {};
  let at = 0;

  // Round tick steps: 1, 2 or 5 times a power of ten.
  const ticks = (a, b) => { const raw = (b - a) / 5, p = 10 ** Math.floor(Math.log10(raw)), s = [1, 2, 5, 10].find((m) => m * p >= raw) * p, o = []; for (let v = Math.ceil(a / s) * s; v <= b + s * 1e-9; v += s) o.push(Number(v.toPrecision(12))); return o; };
  function chart({ label, x: [X0, X1], y: [Y0, Y1], series, notes = [] }) {
    const W = 760, H = 400, l = 62, b = 42, x = (v) => l + ((v - X0) / (X1 - X0)) * (W - l - 24), y = (v) => H - b - ((v - Y0) / (Y1 - Y0)) * (H - b - 16);
    const g = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label });
    for (const v of ticks(Y0, Y1)) g.append(svg("line", { class: "gl", x1: l, x2: W - 24, y1: y(v), y2: y(v) }), svg("text", { x: l - 9, y: y(v) + 6, "text-anchor": "end", "font-size": 17, text: v.toLocaleString("en") }));
    for (const v of ticks(X0, X1)) g.append(svg("text", { x: x(v), y: H - 12, "text-anchor": "middle", "font-size": 17, text: v.toLocaleString("en", { useGrouping: X1 < 1800 || X1 > 2200 }) }));
    g.append(svg("line", { class: "ax", x1: l, x2: W - 24, y1: y(Y0), y2: y(Y0) }));
    for (const s of series) {
      const pts = s.step ? s.points.flatMap((p, i) => (i ? [[p[0], s.points[i - 1][1]], p] : [p])) : s.points;
      g.append(svg("path", { class: s.style === "ink" ? "linea" : "lineh", d: "M" + pts.map(([u, v]) => x(u).toFixed(1) + " " + y(Math.min(Y1, Math.max(Y0, v))).toFixed(1)).join("L") }));
    }
    for (const n of notes) g.append(svg("text", { x: x(n.x), y: y(n.y), "font-size": 20, "font-weight": 700, style: n.color ? "fill: var(--i)" : null, text: n.t }));
    return g;
  }
  const lines = (list) => (list || []).map((l) => el("div", { class: "ln " + (l.tone || "out") }, { cmd: "$ ", add: "+ ", del: "− " }[l.tone] || "", l.t));
  const KINDS = {
    chart,
    grid: (p) => el("div", { class: "grid", style: "--n:" + (p.columns || 10) }, p.items.map((i) => el("span", { class: i.on ? "on" : null, text: i.t }))),
    bars: (p) => { const max = Math.max(...p.rows.map((r) => r.parts.reduce((a, c) => a + c, 0))); return el("div", { class: "bars" }, p.rows.map((r) => el("div", {}, el("span", { text: r.label }), el("span", { class: "b", "aria-hidden": "true" }, r.parts.map((v, i) => el("i", { class: (p.colors || [])[i], style: "width:" + (v / max) * 100 + "%" }))), el("span", { class: "n", text: r.note == null ? r.parts.join(" / ") : r.note })))); },
    flow: (p) => el("ol", { class: "flow" }, p.steps.map((s, i) => el("li", { class: s.on ? "on" : null }, el("b", { "aria-hidden": "true", text: i + 1 }), el("span", {}, el("strong", { text: s.t }), s.sub ? el("span", { text: s.sub }) : null)))),
    swap: (p) => el("div", { class: "swap" }, p.rows.map((r) => el("div", {}, el("span", { text: r.from }), el("em", { role: "img", "aria-label": "becomes", text: "→" }), el("span", { class: "new", text: r.to })))),
    compare: (p) => el("div", { class: "pair" }, [p.left, p.right].map((s) => el("div", {}, el("h2", { text: s.title }), draw(s.pic)))),
    terminal: (p) => el("div", { class: "term" }, lines(p.lines)),
    file: (p) => el("div", { class: "file" }, el("div", { class: "fname", text: p.name }), el("div", { class: "body" }, lines(p.lines))),
    status: (p) => el("div", { class: "facts" }, p.rows.map((r) => el("div", { class: "fact " + r.color }, el("span", { class: "pill", text: r.tag }), el("span", {}, el("b", { text: r.t }), r.sub ? el("span", { text: r.sub }) : null)))),
    custom: (p) => PICS[p.id]({ el, svg, chart, state: (state[p.id] ??= {}), rerender: (id) => { render(); if (id && $(id)) $(id).focus({ preventScroll: true }); } }),
  };
  function draw(p) { try { return KINDS[p.kind](p); } catch (e) { return el("p", { class: "cap", role: "alert", text: "This picture failed to draw: " + e.message }); } }

  function go(i) { at = Math.max(0, Math.min(F.length - 1, i)); render(); window.scrollTo(0, 0); $("fwd").focus({ preventScroll: true }); }
  function render() {
    const f = F[at], last = at === F.length - 1;
    document.title = C.title;
    view.replaceChildren(
      el("section", { class: "board " + f.color },
        el("div", { class: "tell" }, el("span", { class: "no", text: "Step " + (at + 1) + " of " + F.length }), el("h1", { text: f.heading }), el("p", {}, rich(f.say)), f.big ? el("div", { class: "big" }, el("b", { text: f.big.value }), el("span", { text: f.big.label })) : null),
        el("div", { class: "show" }, el("div", { class: "fit" }, draw(f.pic)), f.caption ? el("p", { class: "cap", text: f.caption }) : null, el("p", { class: "src" }, f.src, last && (C.sources || []).length ? [". Sources: ", C.sources.map((s, i) => [i ? ", " : "", el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })])] : null))),
      el("div", { class: "steps" }, el("button", { class: "ghost", type: "button", disabled: !at, onclick: () => go(at - 1) }, "‹ Back"),
        el("nav", { class: "nav", "aria-label": "Steps" }, F.map((x, n) => el("button", { class: x.color + (n < at ? " seen" : ""), type: "button", "aria-current": String(n === at), "aria-label": "Step " + (n + 1) + ": " + x.key, onclick: () => go(n) }, x.key))),
        el("button", { class: "go " + f.color, id: "fwd", type: "button", onclick: () => go(last ? 0 : at + 1) }, last ? "Start again" : "Next: " + F[at + 1].key + " ›")));
    fit();
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
  addEventListener("resize", fit);
  if (document.fonts) document.fonts.ready.then(fit);
  $("ask").title = C.ask;
  $("ask").append(el("span", { text: "You asked: " }), C.ask);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, select")) return;
    const n = at + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);
    if (n !== at && F[n]) { e.preventDefault(); go(n); }
  });
  render();
})();
