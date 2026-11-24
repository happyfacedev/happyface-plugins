// Custom pictures for example-riemann.json. Everything is computed here except the zeros, which are tabulated.
const ZERO = [14.134725, 21.02204, 25.010858, 30.424876, 32.935062, 37.586178, 40.918719, 43.327073, 48.005151, 49.773832, 52.970321, 56.446248, 59.347044, 60.831779, 65.112544, 67.079811, 69.546402, 72.067158, 75.704691, 77.14484, 79.337375, 82.910381, 84.735493, 87.425275, 88.809111, 92.491899, 94.651344, 95.870634, 98.831194, 101.317851];
const isPrime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const countTo = (x) => { let c = 0; for (let i = 2; i <= x; i++) if (isPrime(i)) c++; return c; };
const psi = (x) => { let s = 0; for (let p = 2; p <= x; p++) if (isPrime(p)) for (let q = p; q <= x; q *= p) s += Math.log(p); return s; };
// Logarithmic integral from 2, by Simpson's rule.
const li = (x) => { if (x <= 2) return 0; const n = 400, h = (x - 2) / n; let s = 0; for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) / Math.log(2 + i * h); return (s * h) / 3; };
// Riemann's explicit formula for psi, using the first n zero pairs.
const fromZeros = (x, n) => { const L = Math.log(x), r = Math.sqrt(x); let s = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x)); for (const g of ZERO.slice(0, n)) s -= (2 * r * (0.5 * Math.cos(g * L) + g * Math.sin(g * L))) / (0.25 + g * g); return s; };
const whole = (f, a, b) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, f(a + i)]);
const curve = (f, a, b, n) => Array.from({ length: n + 1 }, (_, i) => { const x = a + ((b - a) * i) / n; return [x, f(x)]; });

PICS.primes = ({ el }) => el("div", { class: "grid", style: "--n:10" }, Array.from({ length: 100 }, (_, i) => el("span", { class: isPrime(i + 1) ? "on" : null, text: i + 1 })));
PICS.count = ({ chart }) => chart({ label: "The number of primes up to 100, as a staircase.", x: [0, 100], y: [0, 30], series: [{ points: whole(countTo, 0, 100), style: "color", step: true }] });
PICS.gauss = ({ chart }) => chart({ label: "The prime staircase and Gauss's smooth estimate, up to 100.", x: [0, 100], y: [0, 30], series: [{ points: whole(countTo, 2, 100), style: "ink", step: true }, { points: curve(li, 2, 100, 300), style: "color" }], notes: [{ x: 28, y: 20, t: "Gauss's estimate", color: true }] });
function strip({ svg }, claim) {
  const L = 190, R = 570, m = 380, y = (t) => 360 - (t / 64) * 335;
  return svg("svg", { viewBox: "0 0 760 400", role: "img", "aria-label": "The critical strip from 0 to 1, with the first twelve zeros, all on the line one half." },
    svg("rect", { class: "soft", x: L, y: 14, width: R - L, height: 346, rx: 8 }), svg("line", { class: "ax", x1: 90, x2: 670, y1: 360, y2: 360 }), svg("line", { class: "lineh", x1: m, x2: m, y1: 14, y2: 360 }),
    [[L, "0"], [m, "½"], [R, "1"]].map(([x, t]) => svg("text", { x, y: 388, "text-anchor": "middle", "font-size": 22, "font-weight": 700, text: t })),
    ZERO.slice(0, 12).map((t) => svg("circle", { class: "fillh", cx: m, cy: y(t), r: 8 })),
    svg("text", { x: m + 20, y: y(ZERO[0]) + 6, "font-size": 19, "font-weight": 700, text: "first zero: 14.13" }), svg("text", { x: L + 12, y: 40, "font-size": 18, text: "critical strip" }), svg("text", { x: m + 16, y: 40, "font-size": 18, "font-weight": 700, style: "fill: var(--i)", text: "critical line" }),
    claim ? [svg("circle", { cx: R - 70, cy: y(34), r: 11, fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-dasharray": "5 4" }), svg("text", { x: R - 70, y: y(34) + 36, "text-anchor": "middle", "font-size": 18, text: "never here?" })] : null);
}
PICS.strip = (h) => strip(h, false);
PICS.claim = (h) => strip(h, true);
PICS.tuned = ({ el, chart, state, rerender }) => {
  state.n ??= 5;
  const n = state.n, miss = whole((i) => Math.abs(fromZeros(i + 0.5, n) - psi(i + 0.5)), 3, 48).reduce((s, p) => s + p[1], 0) / 46;
  return el("div", {},
    el("div", { class: "tune", role: "group", "aria-label": "Zeros used" }, "Zeros used:", [0, 1, 5, 10, 30].map((k) => el("button", { type: "button", id: "z" + k, "aria-pressed": String(k === n), onclick: () => { state.n = k; rerender("z" + k); } }, k)), el("output", { text: "average miss " + miss.toFixed(2) })),
    chart({ label: "The prime staircase up to 50 and the curve built from " + n + " zeros.", x: [0, 50], y: [0, 50], series: [{ points: whole(psi, 2, 50), style: "ink", step: true }, { points: curve((x) => fromZeros(x, n), 2.05, 50, 900), style: "color" }], notes: [{ x: 4, y: 42, t: "plain line: the primes" }, { x: 4, y: 37, t: "colored line: built from zeros", color: true }] }));
};
