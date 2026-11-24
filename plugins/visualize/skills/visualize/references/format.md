# visualize.json: the input format

`scripts/build.mjs` checks one JSON file and writes one self-contained HTML page. `example.json` explains a change with built-in pictures; `example-riemann.json` with `example-riemann.js` explains a concept with custom ones and charts.

| Key | Required | What it is |
| --- | --- | --- |
| `title` | yes | Tab name: "Riemann Hypothesis". |
| `ask` | yes | What the person asked, in their words. |
| `frames` | yes | 2–9 steps. |
| `sources` | no | `[{ "label": "…", "url": "https://…" }]`, shown on the last step. |

## Step

| Key | Required | Rule |
| --- | --- | --- |
| `color` | yes | `orange`, `blue`, `violet`, `rose` or `teal`. One meaning per color. |
| `key` | yes | One or two words for the progress bar. |
| `heading` | yes | 7 words or fewer. |
| `say` | yes | One or two sentences. `**key words**` are highlighted: at most two highlights. Backticks mark code, here only. |
| `big` | no | `{ "value": "25", "label": "primes up to 100" }`. Value of 10 characters or fewer. |
| `pic` | yes | A picture, below. |
| `src` | yes | Where the picture comes from: "Computed", "From git", "From a real run", "Illustration". |
| `caption` | no | One sentence under the picture. |

## Pictures

- **chart**: `{ kind, label, x: [0, 100], y: [0, 30], series: [{ points: [[0, 0], …], style, step }], notes: [{ x, y, t, color }] }`. `style` is `color` or `ink`; `step: true` draws a staircase; `color: true` on a note uses the step's color. `label` describes the chart for screen readers.
- **grid**: `{ kind, items: [{ t, on }], columns }`. Highlights some items of a set.
- **bars**: `{ kind, rows: [{ label, parts: [185, 336], note }], colors: ["teal", "rose"] }`. Drawn to one scale.
- **flow**: `{ kind, steps: [{ t, sub, on }] }`. In order; `on` marks the step this frame is about.
- **swap**: `{ kind, rows: [{ from, to }] }`. Before and after, up to 4 rows.
- **compare**: `{ kind, left: { title, pic }, right: { title, pic } }`. Two built-in pictures side by side.
- **terminal**: `{ kind, lines: [{ t, tone }] }`. Tones: `cmd`, `out`, `err`, `muted`, `hi`.
- **file**: `{ kind, name, lines: [{ t, tone }] }`. Tones: `out`, `muted`, `hi`, `add`, `del`.
- **status**: `{ kind, rows: [{ color, tag, t, sub }] }`. What is proven, reported, open, risky or unchecked.
- **custom**: `{ kind, id }`. Drawn by the custom file.

Limits: 6 rows or steps, 10 bars, 10 lines, 120 grid items.

## Custom pictures

A custom file adds functions to `PICS`. Each returns one DOM node. Build with `node build.mjs story.json story.html custom.js`.

```js
PICS.wave = ({ el, svg, chart, state, rerender }) => {
  state.n ??= 1;
  const points = Array.from({ length: 200 }, (_, i) => [i / 10, 1 + Math.sin((state.n * i) / 10)]);
  return el("div", {},
    el("div", { class: "tune" }, "Waves:", ...[1, 2, 5].map((n) => el("button", { type: "button", id: "w" + n, "aria-pressed": String(n === state.n), onclick: () => { state.n = n; rerender("w" + n); } }, n))),
    chart({ label: "A wave", x: [0, 20], y: [0, 2], series: [{ points, style: "color" }] }));
};
```

- `el(tag, attributes, ...children)` and `svg(tag, attributes, ...children)` build nodes; `on…` attributes are listeners.
- `state` is kept per picture. `rerender(id)` redraws and focuses that id.
- Use `var(--h)` for the step's solid color, `var(--t)` for its tint, `var(--i)` for its color on a background, and `var(--ink)`, `var(--card)`, `var(--muted)`, `var(--line)`. Never fixed colors. White text goes on `var(--h)`.
- Classes ready to use: `tune` (a row of choices), `fillh`, `lineh`, `linea`, `ax`, `soft`.
- The page is one screen and fits each picture to its panel. Return one `svg`, or a `div` holding controls and one `svg`, and the drawing fills the space; anything else is zoomed to fit. Set no heights or widths in pixels.
- Give every `svg` `viewBox="0 0 760 400"`, `role="img"` and `aria-label`. Spread the drawing across it, and keep everything, text included, at least 30 units from every edge: what crosses an edge is cut off. Text of 17 or larger.
