# decide.json: the input format

One JSON file describes one review. `scripts/build.mjs` checks it and writes one self-contained HTML page. `example.json` uses every part.

| Key | Required | What it is |
| --- | --- | --- |
| `title` | yes | Tab and gallery name: "Pricing Decisions". |
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
| `showIf` | no | `{ "question": "<earlier id>", "is": ["a"] }` or `"not": ["a"]`. Otherwise the question is skipped. |
| `group`, `ref` | no | A `groups[].id`; a small source line. |

"Not sure" and "Add a note" are always there.

## Pictures

Use one kind across a question's options.

- **terminal**: `{ kind, lines: [{ t, tone }], exit }`. Tones: `cmd` (first line; the page adds `$`), `out`, `err`, `muted`, `hi`.
- **file**: `{ kind, name, lines }`. Tones: `out`, `muted`, `hi`, `add`, `del`. The page adds + and −.
- **steps**: `{ kind, steps: [{ label, state, who }], note }`. States: `ok`, `fail`, `stuck`, `now`. `who` is optional.
- **numbers**: `{ kind, rows: [{ label, value, tone }] }`. Tone: `good` or `bad`, or none.

Limits: 8 lines, 6 steps or 6 rows, and 3 `hi` lines.

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

## The copied answers

```
SPEC REVIEW ANSWERS

Should spec work through a symlink? [root = keep]
→ Keep it: You pass --root yourself. (recommended: Follow the link)
Note: symlinks are rare for us
```
