// Change briefs: the overview, one screen per change, the review and every file. app.js calls CHANGE(h) when the story is a change brief.
// visualize and visualize-interactive share this file: keep the two copies identical.
const CHANGE = ({ el, svg, rich, draw, go, frames, brief: B, interactive }) => {
  const byId = new Map(B.changes.map((c) => [c.id, c]));
  const screen = (id) => frames.findIndex((f) => f.layout === "change" && f.ref === id);
  const num = (v) => Number(v).toLocaleString("en");
  const KIND = { fix: "Fix", feature: "New", change: "Change", removed: "Removed", refactor: "Refactor", perf: "Faster", security: "Security", tests: "Tests", docs: "Docs", chore: "Chore" };
  const RISK = { low: "Low risk", medium: "Medium risk", high: "High risk" };
  const CHECK = { passed: "✓", failed: "✕", skipped: "–", "not run": "○" };
  const ROLE = { generated: "Generated", version: "Version and release", mechanical: "Mechanical", tests: "Tests", docs: "Docs", config: "Config", other: "Other" };
  const STATUS = { added: "new", deleted: "deleted", renamed: "renamed", binary: "binary" };
  const plural = (n, one, many = one + "s") => num(n) + " " + (n === 1 ? one : many);

  const badge = (c, small) => (c ? el("b", { class: "cn " + c.color + (small ? " sm" : ""), "aria-hidden": "true", text: c.n }) : null);
  const pm = (add, del) => el("span", { class: "pm" }, el("ins", { text: "+" + num(add) }), " ", el("del", { text: "−" + num(del) }));
  const path = (p) => { const i = p.lastIndexOf("/"); return [i >= 0 ? el("span", { class: "dir", text: p.slice(0, i + 1) }) : null, el("span", { class: "base", text: p.slice(i + 1) })]; };
  const out = (href, attrs, ...kids) => (href ? el("a", { href, target: "_blank", rel: "noopener", ...attrs }, ...kids) : el("span", attrs, ...kids));
  const bar = (add, del, max) => el("span", { class: "sz", "aria-hidden": "true" }, el("i", { class: "a", style: `width:${(add / max) * 100}%` }), el("i", { class: "d", style: `width:${(del / max) * 100}%` }));
  const risk = (level) => (level ? el("span", { class: "rk " + level, text: RISK[level] }) : null);

  // ---------- code ----------
  // A light highlighter, line by line: comments, strings, numbers, keywords, and capitalised names as types.
  const KW = new Set("abstract as assert async await break case catch class const continue def default defer deinit do elif else enum except export extends extension factory false final finally fn for from func function guard if impl implements import in init interface is lambda late let match mixin mut new nil null override package pass private protected protocol pub public raise required rethrow return sealed self static struct super switch this throw throws true try typeof undefined val var void where while with yield".split(" "));
  const TOK = {
    c: /\/\/.*$|\/\*.*?(?:\*\/|$)|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?|\b\d[\w.]*\b|\b[A-Za-z_$][\w$]*\b/g,
    hash: /#.*$|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|\b\d[\w.]*\b|\b[A-Za-z_][\w]*\b/g,
    json: /"(?:[^"\\]|\\.)*"?|\b-?\d[\d.eE+-]*\b|\b(?:true|false|null)\b/g,
  };
  const langOf = (file) => {
    const ext = (/\.([a-z0-9]+)$/i.exec(file) || [])[1]?.toLowerCase() || "";
    if (/(^|\/)(Makefile|Dockerfile)$/.test(file) || /^(py|sh|bash|zsh|rb|ya?ml|toml|r|pl|mk|conf|ini|env|gitignore)$/.test(ext)) return "hash";
    if (/^(json|arb|jsonc)$/.test(ext)) return "json";
    if (/^(md|txt|lock|csv|svg|html?|xml|css|sql|diff|patch)$/.test(ext) || !ext) return null;
    return "c";
  };
  function hl(text, lang) {
    const rx = TOK[lang];
    if (!rx || !text) return [text];
    const outp = [];
    let last = 0;
    rx.lastIndex = 0;
    for (let m; (m = rx.exec(text));) {
      const t = m[0], c = t[0];
      if (!t) { rx.lastIndex++; continue; }
      if (m.index > last) outp.push(text.slice(last, m.index));
      const cls = lang === "json" ? (c === '"' ? (/^\s*:/.test(text.slice(rx.lastIndex)) ? "k" : "s") : /[tfn]/.test(c) ? "k" : "n")
        : c === "/" || c === "#" ? "c" : c === '"' || c === "'" || c === "`" ? "s" : /\d/.test(c) ? "n" : KW.has(t) ? "k" : lang === "c" && /^[A-Z][a-z]/.test(t) ? "t" : null;
      outp.push(cls ? el("span", { class: "tk-" + cls, text: t }) : t);
      last = rx.lastIndex;
    }
    if (last < text.length) outp.push(text.slice(last));
    return outp;
  }
  // A changed line next to its replacement: mark only the part that differs.
  function pairUp(rows) {
    for (let i = 0; i < rows.length;) {
      if (rows[i].s !== "-") { i++; continue; }
      let j = i; while (j < rows.length && rows[j].s === "-") j++;
      let k = j; while (k < rows.length && rows[k].s === "+") k++;
      if (k - j === j - i) for (let q = 0; q < j - i; q++) {
        const a = rows[i + q], b = rows[j + q], x = a.t, y = b.t;
        let p = 0; while (p < x.length && p < y.length && x[p] === y[p]) p++;
        let s = 0; while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
        const mid = Math.max(x.length - p - s, y.length - p - s);
        if (mid && mid <= Math.max(x.length, y.length) * 0.7 && x.trim().length - (x.length - p - s) >= 4) { a.em = [p, x.length - s]; b.em = [p, y.length - s]; }
      }
      i = Math.max(k, i + 1);
    }
  }
  function codeCard(k, c) {
    const lang = langOf(k.file), rows = k.rows.map((r) => ({ ...r }));
    // Drop the indent every line shares, so deep code keeps its width.
    const cut = Math.min(...rows.filter((r) => !r.gap && r.t.trim()).map((r) => /^[ \t]*/.exec(r.t)[0].length));
    if (cut > 0 && Number.isFinite(cut)) for (const r of rows) if (!r.gap) { r.t = r.t.slice(Math.min(cut, /^[ \t]*/.exec(r.t)[0].length)); }
    pairUp(rows);
    const line = (r) => {
      if (r.gap) return el("div", { class: "cl gap", "aria-label": "lines skipped", text: "⋯" });
      const kind = r.s === "+" ? "add" : r.s === "-" ? "del" : "ctx", [a, b] = r.em || [0, 0];
      const text = r.em ? [hl(r.t.slice(0, a), lang), el("mark", { class: "em" }, hl(r.t.slice(a, b), lang)), hl(r.t.slice(b), lang)] : hl(r.t, lang);
      return [
        el("div", { class: "cl " + kind, "data-ask": "line " + (r.n ?? r.o) + " of " + k.file + (kind === "ctx" ? "" : kind === "add" ? " (added)" : " (removed)") + ": " + r.t.trim().slice(0, 160) },
          el("span", { text: r.o ?? "" }), el("span", { text: r.n ?? "" }), el("span", { class: "sg", "aria-label": kind === "ctx" ? null : kind === "add" ? "added" : "removed", text: kind === "ctx" ? "" : kind === "add" ? "+" : "−" }), el("code", {}, text.length ? text : " ")),
        r.note ? el("div", { class: "cl note" }, rich(r.note)) : null,
      ];
    };
    return el("figure", { class: "code" },
      el("figcaption", {}, out(k.url, { title: k.url ? "Open on GitHub" : null }, path(k.file)), k.at ? el("span", { class: "at", text: k.at }) : el("span", { class: "at" }), STATUS[k.status] ? el("span", { class: "tag", text: STATUS[k.status] }) : null, pm(k.add, k.del)),
      k.note ? el("p", { class: "cnote" }, rich(k.note)) : null,
      el("div", { class: "rows" }, rows.map(line)));
  }

  // ---------- map ----------
  // Code names break between their words, not mid-word: AccountIdentityMark wraps as Account·Identity·Mark.
  const soft = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, "$1​$2").replace(/([._/])/g, "$1​");
  // pane.lit(id) lights one change's parts and dims the rest; pane.lit(null) shows them all again.
  function map(M) {
    const nodes = new Map();
    let on = null;
    const box = el("div", { class: "map", style: "--cols:" + M.layers.length },
      M.layers.map((name) => el("div", { class: "mcol" }, el("h3", { text: name }), el("div", { class: "mstack" }, M.nodes.filter((nd) => nd.layer === name).map((nd) => {
        const c = byId.get(nd.change), link = !interactive && c;
        const e = el(link ? "button" : "div", { class: "node " + nd.state + (c ? " " + c.color : ""), type: link ? "button" : null, title: nd.sub || null, "data-ask": "the box \"" + nd.label + "\" in the map" + (c ? ", part of change " + c.n + ": " + c.title : "") + (nd.sub ? ". " + nd.sub : ""), onclick: link ? () => go(screen(c.id)) : null },
          badge(c, true), el("span", { text: soft(nd.label) }), nd.state === "new" ? el("small", { text: soft(nd.sub || "new") }) : nd.state === "removed" ? el("small", { text: soft(nd.sub || "removed") }) : nd.sub ? el("small", { text: soft(nd.sub) }) : null);
        nodes.set(nd.id, e);
        return e;
      })))));
    const wires = svg("svg", { class: "wires", "aria-hidden": "true" });
    box.append(wires);
    const layer = (id) => M.layers.indexOf(M.nodes.find((nd) => nd.id === id).layer);
    const lay = () => {
      const b = box.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
      if (!w) return;
      const z = b.width / w || 1;
      const rect = (id) => { const r = nodes.get(id).getBoundingClientRect(); return { l: (r.left - b.left) / z, r: (r.right - b.left) / z, t: (r.top - b.top) / z, b: (r.bottom - b.top) / z, x: (r.left + r.width / 2 - b.left) / z, y: (r.top + r.height / 2 - b.top) / z }; };
      wires.setAttribute("viewBox", `0 0 ${w} ${h}`);
      wires.replaceChildren(...M.edges.flatMap((e) => {
        const a = rect(e.from), c = rect(e.to), la = layer(e.from), lc = layer(e.to);
        let d, head, mx, my;
        if (la !== lc) {
          const fwd = la < lc, x1 = fwd ? a.r : a.l, x2 = fwd ? c.l - 3 : c.r + 3, k = (x2 - x1) / 2;
          d = `M${x1} ${a.y} C${x1 + k} ${a.y} ${x2 - k} ${c.y} ${x2} ${c.y}`;
          head = fwd ? `M${x2 + 3} ${c.y} l-9 -5 v10 z` : `M${x2 - 3} ${c.y} l9 -5 v10 z`;
          [mx, my] = [(x1 + x2) / 2, (a.y + c.y) / 2];
        } else {
          const down = a.y < c.y, y1 = down ? a.b : a.t, y2 = down ? c.t - 3 : c.b + 3;
          d = `M${a.x} ${y1} L${a.x} ${y2}`;
          head = down ? `M${a.x} ${y2 + 3} l-5 -9 h10 z` : `M${a.x} ${y2 - 3} l-5 9 h10 z`;
          [mx, my] = [a.x + 8, (y1 + y2) / 2 + 4];
        }
        const cls = (e.color ? "hue " + e.color + " " : "") + e.state + (on && e.change !== on ? " dim" : "");
        // A label goes only where the gap between the boxes can hold it; the box's own text says the rest.
        const room = la === lc ? Infinity : Math.abs(la < lc ? c.l - a.r : a.l - c.r) * (Math.abs(lc - la) === 1 ? 1 : 2.2);
        const label = e.t && room >= e.t.length * 6.6 + 10;
        return [svg("path", { class: cls, d }), svg("path", { class: cls + " head", d: head }), label ? svg("text", { class: cls, x: mx, y: my - 7, "text-anchor": la !== lc ? "middle" : "start", text: e.t }) : null].filter(Boolean);
      }));
    };
    if (typeof ResizeObserver === "function") new ResizeObserver(() => lay()).observe(box);
    requestAnimationFrame(lay);
    if (document.fonts) document.fonts.ready.then(lay);
    const states = new Set(M.nodes.map((nd) => nd.state));
    const pane = el("div", { class: "mapbox" },
      el("div", { class: "mapwrap" }, box),
      el("p", { class: "legend" }, ["new", "changed", "context", "removed"].filter((s) => states.has(s)).map((s) => el("span", { class: "l-" + s, text: { new: "new", changed: "changed", context: "unchanged, for context", removed: "removed" }[s] }))),
      el("p", { class: "src", text: M.src }));
    pane.lit = (id) => { on = id; for (const nd of M.nodes) nodes.get(nd.id).classList.toggle("dim", !!on && nd.change !== on); lay(); };
    return pane;
  }

  // ---------- screens ----------
  // The overview answers one question, what the change does: the answer and four facts in the panel, the changes listed beside it.
  function overview() {
    const S = B.stats, src = B.source, checks = B.checks || [];
    const count = (s) => checks.filter((x) => x.state === s).length;
    const tally = ["passed", "failed", "skipped", "not run"].filter((s) => count(s)).map((s) => num(count(s)) + " " + s).join(" · ");
    const fact = (label, ...value) => el("div", {}, el("dt", { text: label }), el("dd", {}, ...value));
    const meta = src ? [src.head && src.base ? src.head + " → " + src.base : "", src.state, src.author ? "by " + src.author : ""].filter(Boolean).join(" · ") : "";
    const plain = (s) => String(s).replace(/\*\*|`/g, "");
    const rows = B.changes.map((c) => el("li", { class: "crow " + c.color, "data-ask": "change " + c.n + ", " + plain(c.title) + ". After it: " + plain(c.after) },
      badge(c),
      el("div", { class: "ct" }, el("h3", {}, interactive ? rich(c.title) : el("button", { class: "open", type: "button", onclick: () => go(screen(c.id)) }, rich(c.title))), el("p", {}, rich(c.after))),
      el("div", { class: "meta" }, el("span", { text: KIND[c.kind] }), pm(c.add, c.del), c.risk && c.risk.level !== "low" ? risk(c.risk.level) : null),
      interactive ? el("button", { class: "chev", type: "button", title: "Open change " + c.n, onclick: () => go(screen(c.id)) }, "›", el("span", { class: "sr", text: "Open change " + c.n })) : el("span", { class: "chev", "aria-hidden": "true", text: "›" })));
    return el("section", { class: "board brief ovw", id: "board" },
      el("div", { class: "tell" },
        src ? el("p", { class: "srcline" }, out(src.url, {}, el("b", { text: src.label })), meta ? el("span", { text: meta }) : null) : null,
        el("h1", {}, rich(B.answer)),
        el("dl", { class: "sum" },
          fact("Size", pm(S.add, S.del), " in " + plural(S.files, "file")),
          fact("Checks", checks.length ? el("span", { class: count("failed") ? "bad" : null, text: tally }) : "None recorded"),
          B.risk ? fact("Risk", B.risk[0].toUpperCase() + B.risk.slice(1)) : null,
          B.effort ? fact("Review", B.effort) : null)),
      el("div", { class: "show" },
        el("h2", { text: plural(B.changes.length, "change") + ", in reading order" }),
        el("ol", { class: "clist" }, rows),
        el("p", { class: "src", text: interactive ? "Click a change to ask about it; › opens its code." : "Open a change to see its code." })));
  }

  // The map has a screen of its own; its legend lights up one change's parts.
  function where(f) {
    const M = B.map, pane = map(M), n = (s) => M.nodes.filter((nd) => nd.state === s).length;
    const parts = [["changed", n("changed")], ["new", n("new")], ["removed", n("removed")], ["shown for context", n("context")]].filter(([, k]) => k).map(([s, k]) => num(k) + " " + s).join(", ");
    const lit = (id) => () => pane.lit(id);
    const touched = B.changes.filter((c) => M.nodes.some((nd) => nd.change === c.id) || M.edges.some((e) => e.change === c.id));
    return el("section", { class: "board brief mapscreen", id: "board" },
      el("div", { class: "tell" },
        el("span", { class: "no", text: "Map" }),
        el("h1", { text: f.heading }),
        el("p", { text: plural(M.nodes.length, "part") + " of the code: " + parts + "." }),
        el("ul", { class: "mlegend", "aria-label": "Changes on the map" }, touched.map((c) => el("li", { onmouseenter: lit(c.id), onmouseleave: lit(null) },
          badge(c, true), interactive ? el("span", {}, rich(c.title)) : el("button", { type: "button", onclick: () => go(screen(c.id)), onfocus: lit(c.id), onblur: lit(null) }, rich(c.title))))),
        el("p", { class: "hint", text: "Point at a change to light up its parts." })),
      el("div", { class: "show" }, pane));
  }

  // The shortest end of each path that no other path in the list shares: page.html twice becomes decide/assets/page.html.
  const short = (paths) => paths.map((p) => { const s = p.split("/"); for (let k = 1; k < s.length; k++) { const end = s.slice(-k).join("/"); if (paths.filter((q) => q === end || q.endsWith("/" + end)).length === 1) return end; } return p; });
  function change(f) {
    const c = byId.get(f.ref), shown = c.files.slice(0, 7), more = c.files.length - shown.length, names = short(c.files);
    const fileUrl = (p) => B.files.find((x) => x.path === p)?.url;
    const sizes = new Map(B.files.map((x) => [x.path, x]));
    return el("section", { class: "board brief cs " + c.color, id: "board" },
      el("div", { class: "tell" },
        el("span", { class: "no", text: "Change " + c.n + " of " + B.changes.length + " · " + KIND[c.kind] }),
        el("h1", {}, rich(c.title)),
        el("p", {}, rich(c.what)),
        c.why ? el("p", { class: "why" }, rich(c.why)) : null,
        el("dl", { class: "ba2" }, el("div", {}, el("dt", { text: "Before" }), el("dd", {}, rich(c.before))), el("div", { class: "after" }, el("dt", { text: "After" }), el("dd", {}, rich(c.after)))),
        el("p", { class: "basis", text: c.basis || "From reading the diff." }),
        c.risk ? el("p", { class: "risk" }, el("b", { text: RISK[c.risk.level] }), rich(c.risk.t)) : null,
        el("ul", { class: "flist", "aria-label": "Files in this change" },
          shown.map((p, i) => el("li", {}, out(fileUrl(p), { class: "f", title: p }, el("bdi", { text: names[i] })), pm(sizes.get(p).add, sizes.get(p).del))),
          more > 0 ? el("li", { class: "more", text: "and " + plural(more, "more file") + " under Files" }) : null)),
      el("div", { class: "show" },
        c.pic ? el("figure", { class: "card" }, draw(c.pic), c.caption ? el("p", { class: "cap" }, rich(c.caption)) : null, el("p", { class: "src", text: c.src || "" })) : null,
        c.code.map((k) => codeCard(k, c)),
        el("p", { class: "src", text: c.code.length ? "Code copied from the diff when this page was built." + (c.code.some((k) => k.rows.length > 1) ? " Shared indentation is removed." : "") : "No code shown for this change: its files are listed under Files." })));
  }

  function review(f) {
    const R = B.review, checks = B.checks || [], chip = (x) => (x.change ? badge(byId.get(x.change), true) : el("span"));
    return el("section", { class: "board brief rv rose", id: "board" },
      el("div", { class: "tell" }, el("span", { class: "no", text: "Review" }), el("h1", {}, rich(f.heading)), f.say ? el("p", {}, rich(f.say)) : null,
        B.risk ? el("div", { class: "big" }, el("b", { text: B.risk[0].toUpperCase() + B.risk.slice(1) }), el("span", { text: "overall risk" })) : null),
      el("div", { class: "show" },
        R.first.length ? el("section", { class: "sect" }, el("h2", { text: "Look here first" }), el("ol", { class: "firsts" }, R.first.map((x) => { const m = /^(.*?)(:\d+(?:[-–]\d+)?)$/.exec(x.at) || [null, x.at, ""]; return el("li", {}, el("div", {}, el("span", { class: "at" }, out(x.url, {}, path(m[1]), m[2])), rich(x.t)), chip(x)); }))) : null,
        R.risks.length ? el("section", { class: "sect" }, el("h2", { text: "What could break" }), R.risks.map((x) => el("div", { class: "riskrow" }, risk(x.level), el("div", {}, el("b", {}, rich(x.t)), x.sub ? el("small", {}, rich(x.sub)) : null), chip(x)))) : null,
        el("section", { class: "sect" }, el("h2", { text: "Checks" }), checks.length ? checks.map((x) => el("div", { class: "chk " + x.state.replace(" ", "-") }, el("span", { class: "ic", "aria-hidden": "true", text: CHECK[x.state] }), el("div", {}, el("b", { text: x.t }), el("small", {}, x.state[0].toUpperCase() + x.state.slice(1), x.sub ? ". " + x.sub : "")), x.url ? out(x.url, {}, "Run ↗") : el("span"))) : el("p", { class: "src", text: "No checks were recorded for this change." })),
        el("section", { class: "sect" }, el("h2", { text: "Not checked" }), R.unchecked.length ? el("ul", { class: "unchk" }, R.unchecked.map((t) => el("li", {}, rich(t)))) : el("p", { class: "src", text: "Nothing listed. That is a claim too: ask if you doubt it." })),
        (B.sources || []).length ? el("p", { class: "src" }, "Sources: ", B.sources.map((s, i) => [i ? ", " : "", el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })])) : null));
  }

  function files() {
    const max = Math.max(1, ...B.files.map((x) => x.add + x.del));
    const row = (x, c) => el("div", { class: "frow", "data-ask": "the file " + x.path + " (+" + x.add + " −" + x.del + (x.role ? ", " + x.role : "") + (x.note ? ": " + x.note : "") + ")" },
      out(x.url, { class: "f" }, path(x.path), STATUS[x.status] ? el("span", { class: "tag", text: STATUS[x.status] }) : null, x.old ? el("span", { class: "tag", text: "from " + x.old.split("/").pop() }) : null, x.changes.filter((id) => id !== c?.id).map((id) => badge(byId.get(id), true))),
      pm(x.add, x.del), bar(x.add, x.del, max));
    const groups = [
      ...B.changes.map((c) => [c, B.files.filter((x) => x.changes.includes(c.id))]),
      ...Object.keys(ROLE).map((role) => [role, B.files.filter((x) => !x.changes.length && x.role === role)]),
    ].filter(([, list]) => list.length);
    const inChanges = B.files.filter((x) => x.changes.length).length, others = B.files.length - inChanges;
    return el("section", { class: "board brief fl teal", id: "board" },
      el("div", { class: "tell" }, el("span", { class: "no", text: "Every file" }), el("h1", { text: "All " + plural(B.stats.files, "file") }),
        el("p", {}, rich("**" + num(inChanges) + "** " + (inChanges === 1 ? "is" : "are") + " in the changes" + (others ? "; **" + num(others) + "** " + (others === 1 ? "is" : "are") + " " + [...new Set(B.files.filter((x) => !x.changes.length).map((x) => ROLE[x.role].toLowerCase()))].join(", ") : "") + ".")),
        el("div", { class: "big" }, el("b", {}, pm(B.stats.add, B.stats.del)), el("span", { text: "lines added and removed" }))),
      el("div", { class: "show" }, groups.map(([g, list]) => {
        const c = typeof g === "string" ? null : g, add = list.reduce((s, x) => s + x.add, 0), del = list.reduce((s, x) => s + x.del, 0);
        return el("details", { class: "fgroup" + (c ? " " + c.color : ""), open: c || list.length <= 8 ? true : null },
          el("summary", {}, badge(c, true), el("span", { class: "grow" }, c ? c.title : ROLE[g], " ", el("span", { class: "cnt", text: plural(list.length, "file") })), pm(add, del)),
          list.map((x) => row(x, c)));
      }), el("p", { class: "src", text: "Counted from the diff. A file in two changes shows the other change's number." })));
  }

  return { overview, map: where, change, review, files };
};
