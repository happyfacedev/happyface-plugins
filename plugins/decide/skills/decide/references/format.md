# decide.json: the input format

One JSON file describes one review. `scripts/build.mjs` checks it and turns it into one self-contained HTML page.

```json
{
  "title": "spec Review",
  "eyebrow": "spec reviewing its own spec",
  "heading": "Review spec's own spec",
  "intro": "Nine agents wrote spec's spec from its code and tests. Before it becomes the source of truth, it needs your answers to the open questions.",
  "minutes": 15,
  "exportHeader": "SPEC REVIEW ANSWERS",
  "groupNoun": "module",
  "groupNounTitle": "Module",
  "choices": ["keep", "change", "docs", "unsure"],
  "wording": { "choices": { "change": { "goes": [["You get the ", "Change", " picture. I file a /change ticket for it."]] } } },
  "groups": [ GROUP, ... ],
  "questions": [ QUESTION, ... ],
  "extras": EXTRAS
}
```

| Key | Required | What it is |
| --- | --- | --- |
| `title` | yes | Tab and gallery name. A short noun phrase: "spec Review", "Pricing Decisions". |
| `eyebrow` | no | One muted line above the start heading. |
| `heading` | no | The start page's h1. Defaults to `title`. |
| `intro` | no | One or two sentences: what was done, and why answers are needed now. |
| `minutes` | no | Estimate shown on the start page. Default: about 15 s per question plus 30 s per group review. |
| `exportHeader` | no | First line of the copied answers. |
| `groupNoun`, `groupNounTitle` | no | What a group is called: "module" / "Module", "area" / "Area". |
| `choices` | no | The answer options, in order. Default `keep, change, docs, unsure`. Drop `docs` when there is no docs-vs-behaviour split. |
| `wording` | no | Overrides any fixed text (below). |
| `storageKey` | no | localStorage key. Default: from the title. Change it to start fresh. |

## QUESTION

```json
{
  "id": "CLI-002#Q1",
  "group": "cli",
  "h": "Should spec work when it is run through a symlink?",
  "today": "A symlinked spec cannot find its spec folder. You have to pass --root.",
  "why": "The launcher already follows the link to load the CLI. Only the folder lookup does not.",
  "change": "Follow the link first, then look for the spec folder.",
  "rec": "change",
  "recWhy": "The launcher already follows the link. Root lookup should too, or a symlinked spec on PATH never works.",
  "ref": "CLI-002 Find the spec root",
  "visual": {
    "caption": "What you see when spec runs through a symlink on your PATH.",
    "today": { "kind": "terminal", "lines": [ { "t": "~/bin/spec lint", "tone": "cmd" }, { "t": "no spec root: pass --root, set SPEC_ROOT, or run the bundled scripts/spec", "tone": "hi" } ], "exit": 2 },
    "after": { "kind": "terminal", "lines": [ { "t": "~/bin/spec lint", "tone": "cmd" }, { "t": "lint clean", "tone": "hi" } ], "exit": 0 }
  }
}
```

| Key | Required | Rule |
| --- | --- | --- |
| `id` | yes | Stable ID. It is how the answer comes back. |
| `group` | no | A `groups[].id`. Questions show in group order. |
| `h` | yes | The question, as the page heading. Ends in "?". 12 words or fewer. Front-load the subject. |
| `today` | yes | What happens now, in 1–2 sentences. Shown on the Today panel. |
| `change` | yes | Exactly what choosing Change does, in one sentence. Shown on the Change panel and in the summary. |
| `why` | yes | Why it matters to the person deciding. One sentence. |
| `rec` | no | One of `choices`. Marks the option and its panel "Recommended". |
| `recWhy` | with `rec` | One or two sentences of reasoning. |
| `ref` | no | Where it came from, shown small under the note box. IDs belong here, not in `h`. |
| `goes` | no | Per-option override of the "You get the … picture" line: `{ "change": "I file a ticket and run it." }`. |
| `legend` | no | Override "What should I do?". |
| `visual` | yes | `{ caption, today: PANEL, after: PANEL }`. See below. |

## PANEL: the picture

Today shows what really happens now, copied from a real run, the code or its tests. After shows what `change` describes, invented in the same style, adding nothing that `change` does not say. Use the **same kind and the same command** on both sides so they compare line for line.

**terminal**: the command, its output, the exit code.
```json
{ "kind": "terminal", "lines": [ { "t": "spec lint --depth 0", "tone": "cmd" }, { "t": "--depth is a whole number of 1 or more", "tone": "hi" }, { "t": "usage: spec <command> [options] …", "tone": "muted" } ], "exit": 2 }
```
Tones: `cmd` (the first line, no `$`: the page adds it), `out`, `err` (stderr), `muted` (elided or unimportant), `hi` (the line the question is about). `exit`: an int, or null to hide it.

**file**: a file or doc excerpt.
```json
{ "kind": "file", "name": "docs/FORMAT.md", "lines": [ { "t": "## Decisions", "tone": "muted" }, { "t": "status: accepted", "tone": "del" }, { "t": "status: active", "tone": "add" } ] }
```
Tones: `out`, `muted`, `hi`, `add` (green, +), `del` (red, −, struck through).

**steps**: a flow, for anything that happens over time.
```json
{ "kind": "steps", "steps": [ { "label": "reviewer: changes ×3", "state": "fail" }, { "label": "question answered", "state": "ok" }, { "label": "start refused", "state": "stuck" } ], "note": "Every start is refused." }
```
States: `ok` ✓, `fail` ✕, `stuck` ■ (dashed: the dead end), `now` ● (what happens next). Labels of 2–5 words. One-sentence `note` under it.

Limits, enforced by the build: at most 8 lines or 6 steps per panel, at most 3 `hi` lines, terminal panels start with `cmd`, file panels have a `name`. Warned: lines over 90 characters (aim for 72), captions over 16 words, different kinds on the two sides.

**For a decision with no software in it** (a policy, a price, a process), use `steps` or `file`. A `file` panel can be an email, a page of a doc or a price table. The rule stays the same: what it is now, next to what it would be.

## GROUP

```json
{
  "id": "cli",
  "label": "cli",
  "summary": "How every spec command starts: finding the spec folder, the shared options, help text and exit codes.",
  "review": {
    "heading": "Is the cli module right?",
    "intro": "It has 6 features and 65 scenarios. Open a feature to see its scenarios.",
    "legend": "Should I confirm this module?",
    "summaryLabel": "Confirm the module?",
    "options": [["approve", "Yes, confirm it", "I mark every unit in this module as confirmed."], ["look", "Mostly, but I want to read some features with you first", "Name them below. I confirm the rest."], ["hold", "Not yet", "I leave the module as drafts."]],
    "items": [ { "title": "Find the spec root", "count": "18 scenarios", "intro": "…", "details": [ { "id": "S1", "text": "--root names the spec root" } ], "ref": "CLI-002 · spec/modules/cli/features/CLI-002-find-the-spec-root.md" } ]
  }
}
```

A group without `review` only orders and captions its questions. A group with `review` adds an approval screen after its questions. Its `items` open one level deep and no deeper.

## EXTRAS: a pick-any list before the summary

```json
{
  "caption": "Almost done",
  "heading": "Which bugs should I file?",
  "startStep": "Pick the bugs to file.",
  "intro": "Drafting the spec turned up these bugs in the code. Each one I file becomes a ticket.",
  "legend": "Select all that should be filed",
  "summaryHeading": "Bugs to file",
  "exportLabel": "bugs to file",
  "items": [ { "id": "PIP-002 dead end", "text": "A ticket stays stuck after three review rounds, even once its question is answered.", "default": true } ]
}
```

## wording: fixed text you may override

`todayBadge` "Today", `changeBadge` "Change", `todayTitle` "Keep it", `changeTitle` "Change it", `why` "Why it matters", `rec` "My recommendation: ", `legend` "What should I do?", `recommended` "Recommended", `noteLabel`, `noteHint`, `start`, `resume`, `acceptAll`, `safety` (the start page's reassurance line), `send` (above Copy answers), and `choices.<key>.{label, goes, side}`.

`goes` is a list of parts; a part that is a 3-item array renders its middle item bold: `[["You get the ", "Today", " picture."]]`. `side` is `"today"`, `"after"` or `null`, and decides which panel an option lights up.

## The copied answers

```
SPEC REVIEW ANSWERS

## cli: approve | read CLI-002 first
CLI-001#Q1: change (=rec)
CLI-002#Q1: keep (rec change) | symlinks are rare for us
CLI-003#Q2: unanswered

## bugs to file: PIP-002 dead end; plan double-listing
```

`(=rec)` means the answer matches the recommendation; `(rec X)` means it differs and names the recommendation. `unanswered` counts as not sure.
