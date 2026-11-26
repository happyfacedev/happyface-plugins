# decide.json: the input format

One JSON file describes one review. `scripts/build.mjs` checks it and writes one self-contained HTML page. `example.json` uses every part.

| Key | Required | What it is |
| --- | --- | --- |
| `title` | yes | Tab and gallery name: "Pricing Decisions". |
| `about` | no | What the review is about: the change, where it lives and what happens now. See ABOUT. |
| `intro` | no | One or two sentences above the first question. |
| `questions` | yes | See QUESTION. Shown in this order, within their groups. |
| `batch` | no | Small safe changes accepted on one screen. |
| `groups` | no | `{ id, label, summary, review }`. Orders and captions questions; `review` adds an approval screen. |
| `extras` | no | A pick-any list. It always starts unticked. |
| `exportHeader` | no | First line of the copied answers. |
| `storageKey` | no | localStorage key. Default: from the title. |
| `wording` | no | Overrides `recommended`, `unsure`, `addNote`, `noteLabel`, `next`, `acceptAll`, `copy`, `copyOne`, `safety`. |

A review of one question, with no group review, batch or extras, has no summary screen: the button copies the answer.

## QUESTION

```json
{
  "id": "root",
  "h": "Should spec work through a symlink?",
  "why": "A symlinked spec on your PATH fails today.",
  "rec": "follow",
  "recWhy": "It should just work.",
  "ref": "CLI-002 Find the spec root",
  "options": [
    { "id": "keep", "name": "Keep it", "does": "You pass --root yourself.", "src": "From a real run",
      "pic": { "kind": "terminal", "lines": [ { "t": "~/bin/spec lint", "tone": "cmd" }, { "t": "no spec root: pass --root", "tone": "hi" } ], "exit": 2 },
      "facts": { "Work": "None", "Risk": "Surprises new users", "Undo": "Nothing to undo" } },
    { "id": "follow", "name": "Follow the link", "does": "Follow the link, then look for the spec folder.", "src": "Mock-up",
      "pic": { "kind": "terminal", "lines": [ { "t": "~/bin/spec lint", "tone": "cmd" }, { "t": "lint clean", "tone": "hi" } ], "exit": 0 },
      "facts": { "Work": "Small", "Risk": "Low", "Undo": "Easy" } }
  ]
}
```

| Key | Required | Rule |
| --- | --- | --- |
| `id` | yes | Stable. It comes back with the answer. |
| `h` | yes | The question, ending in "?", 12 words or fewer. |
| `why` | yes | Why it matters to the person deciding. One sentence. |
| `options` | yes | 2–4. Each needs `id`, `name`, `does`, `src`, `pic` and `facts` with `Work`, `Risk`, `Undo`. |
| `options[].permanent` | no | `true` when it cannot be undone. It is marked, and "Accept all recommendations" leaves it out. |
| `rec`, `recWhy` | no | An option id, and the reason in one sentence. |
| `context` | no | What this question is about: `{ now, where, pic, src }`. See ABOUT. |
| `showIf` | no | `{ "question": "<earlier id>", "is": ["a"] }` or `"not": ["a"]`. Otherwise the question is skipped. |
| `group`, `ref` | no | A `groups[].id`; a small source line. |

"Not sure" and "Add a note" are always there.

## ABOUT

What a review, or one question, is about: the change it belongs to, where that lives in the code, and what happens now.

```json
"about": { "what": "Get spec ready to install on a new machine.", "why": "Both came up while installing spec on a fresh laptop.",
  "where": [ { "at": "cli/root.mjs:12", "t": "specRoot() finds the spec folder" } ],
  "pic": { "kind": "terminal", "lines": [ { "t": "~/bin/spec lint", "tone": "cmd" }, { "t": "no spec root", "tone": "hi" } ], "exit": 2 }, "src": "From a real run" }
"context": { "now": "spec looks for its folder next to the file you ran.", "where": ["cli/root.mjs:12"],
  "pic": { "kind": "file", "name": "cli/root.mjs", "lines": [ … ] }, "src": "From reading the code" }
```

| Key | Rule |
| --- | --- |
| `about.what` | The change the decisions belong to, one sentence of 20 words or fewer. Required in `about`. |
| `about.why` | Why it comes up now, one sentence. |
| `where` | Up to 6 places, each `"path:line"` or `{ "at": "path:line", "t": "what lives there" }`. |
| `context.now` | What happens today, one sentence of 20 words or fewer. |
| `pic`, `src` | A real picture of today: the code, a run or numbers. In `about` it shows beside `where`; in `context` it waits behind "Show the code", so the screen still fits. `src` says where it comes from. |

With two or more screens, `about` opens the review with every decision ahead listed. A review of one question shows `about.what` as its intro and the rest as that question's context.

## Pictures

Use one kind across a question's options.

- **terminal**: `{ kind, lines: [{ t, tone }], exit }`. Tones: `cmd` (first line; the page adds `$`), `out`, `err`, `muted`, `hi`.
- **file**: `{ kind, name, lines }`. Tones: `out`, `muted`, `hi`, `add`, `del`. The page adds + and −.
- **steps**: `{ kind, steps: [{ label, state, who }], note }`. States: `ok`, `fail`, `stuck`, `now`. `who` is optional.
- **numbers**: `{ kind, rows: [{ label, value, tone }] }`. Tone: `good` or `bad`, or none.
- **diff**: `{ kind, file, lines: [{ t, tone, n }] }`. Tones: `add`, `del`, `ctx` (default). `n` is the line number. A removed line followed by its replacement marks only the part that differs. Use it when the options are code: each shows the lines it would write.

Limits: 8 lines (10 in a diff), 6 steps or 6 rows, and 3 `hi` lines.

## Batch, extras and group review

```json
"batch": { "heading": "Accept these two small fixes?", "why": "Each is easy to undo.",
  "items": [ { "id": "typo", "name": "Fix the help text", "today": "Says lnit.", "after": "Says lint." } ] }
"extras": { "heading": "Which bugs should I file?", "intro": "…", "items": [ { "id": "BUG-1", "text": "…" } ] }
"groups": [ { "id": "cli", "label": "cli", "summary": "…", "review": { "heading": "Is the cli module right?", "intro": "…",
  "options": [["approve", "Yes, approve it", "…"]], "items": [ { "title": "…", "count": "3 scenarios", "details": [ { "id": "S1", "text": "…" } ] } ] } } ]
```

Batch items start ticked, and count only once the person presses Accept. An unticked item comes back as "Talk about".

## The older question shape

Questions with `today`, `change` and `visual: { today, after }` instead of `options` still build. They become Keep, Change and Docs options without facts. Prefer `options`.

The summary screen shows what each chosen option does, so the person approves the whole change at once.

## The copied answers

```
SPEC REVIEW ANSWERS

Should spec work through a symlink? [root = keep]
→ Keep it: You pass --root yourself. (recommended: Follow the link)
Note: symlinks are rare for us
```
