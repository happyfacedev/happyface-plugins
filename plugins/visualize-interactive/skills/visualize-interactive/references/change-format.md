# change.json: the change brief format

A change brief explains a code change: a pull request, a commit, a branch or uncommitted work. The page has an overview of every change, one screen per change with its real code, a review screen and every file. `example-change.json` with `example-change.diff` uses every part.

`node scripts/change.mjs change.diff` lists every file with its counts and the line ranges of its hunks. The command in SKILL.md then checks the brief against the diff, given with `--diff change.diff`, and builds the page.

The diff is the source of truth. The size, the file list and every line of code on the page come from it, so the page cannot drift from the change.

| Key | Required | What it is |
| --- | --- | --- |
| `kind` | yes | `"change"`. |
| `title` | yes | Tab name: "Astro PR 9". |
| `ask` | yes | What the person asked, in their words. |
| `answer` | yes | What the change does, one sentence of 25 words or fewer, in the words of whoever uses it. `**key words**` at most twice. |
| `source` | no | `{ label, url, base, head, state, author }`. A GitHub pull request, commit or compare `url` links every file and line. |
| `changes` | yes | 1–6, in reading order. See Change. |
| `others` | no | Files in no change: `[{ match, role, note }]`. See Every file. |
| `map` | no | Where the change lands. See Map. |
| `review` | no | `{ heading, say, first, risks, unchecked }`. See Review. |
| `checks` | no | What ran: up to 8 `{ t, state, sub, url }`. `state` is `passed`, `failed`, `skipped` or `not run`. Copy outcomes; never assume them. |
| `risk` | no | `low`, `medium` or `high`. Default: the highest risk given anywhere. |
| `effort` | no | Your estimate of review time: "~20 min". |
| `sources` | no | `[{ "label": "…", "url": "https://…" }]`, shown on the review screen. |

## Change

One change is one reason the code changed: a fix, a feature, a removal. Group by intent, never by file or folder.

| Key | Required | Rule |
| --- | --- | --- |
| `id` | yes | Short and stable: "images". |
| `key` | yes | One or two words for the progress bar. |
| `kind` | yes | `fix`, `feature`, `change`, `removed`, `refactor`, `perf`, `security`, `tests`, `docs` or `chore`. |
| `title` | yes | What it does, active, 8 words or fewer: "Images send again in account panes". |
| `what` | yes | One or two sentences: what changed and how it works now. |
| `why` | no | The reason, from the PR, an issue, a commit or a spec. Never a guess. |
| `before`, `after` | yes | What a user or a caller sees, 14 words or fewer each. Not the implementation. |
| `basis` | no | What before and after rest on: "From the diff and its tests", "From a real run". Default: "From reading the diff." |
| `risk` | no | `{ "level": "low", "t": "what could go wrong, for whom" }`. |
| `files` | yes | Paths or globs from the diff: `lib/remote/**`, `test/*_test.dart`. A file may belong to two changes. |
| `code` | no | Up to 4 pieces of the diff. See Code. |
| `pic`, `src`, `caption` | no | A built-in picture from `format.md` (flow, swap, compare, terminal, file, status…) when a flow or an output shows the change better than code. `src` says where it comes from. |

Changes take blue, violet, orange, sky, plum and olive in order. Rose means risk and teal means checked, everywhere.

## Code

```json
{ "file": "pane_command_catalog.dart", "lines": [46, 64], "note": "Two edits decide whether the composer accepts images.",
  "notes": [ { "line": 52, "t": "The lookup now uses the account and the workspace." } ] }
```

- `file`: a path in the diff, or its end when only one file ends that way.
- `lines`: the first and last line number, on the new side. Add `"side": "old"` for a deleted file. The page shows the diff's own lines in that range, added and removed, with both line numbers. Code cannot be typed into the brief: the build copies it from the diff.
- `note`: one sentence above the code. `notes`: up to 6, each under its line; `old` instead of `line` puts it under a removed line.
- Show the lines that carry the change, 40 or fewer (80 at most), not the whole hunk. `node change.mjs` shows the ranges, and the build says which ranges a file's hunks cover when one misses.

## Every file

Every file in the diff must be in a change or match `others`, or the build fails and lists the files left over. That is what lets the reader trust the overview as complete.

`others` entries are `{ "match": "path or glob", "role": "…", "note": "…" }`. Roles: `generated`, `version`, `mechanical`, `tests`, `docs`, `config`, `other`. The files screen groups them under their role.

## Map

```json
{ "layers": ["What you see", "Logic", "Data"],
  "nodes": [ { "id": "check", "label": "Image check", "layer": "Logic", "change": "images", "sub": "PaneCommandCatalog" } ],
  "edges": [ { "from": "composer", "to": "check", "change": "images", "t": "asks" } ] }
```

- Layers run left to right in the direction calls or data flow: up to 5 layers, 5 nodes each, 16 nodes and 24 edges in all.
- A node with a `change` takes its color and number. A node without one is unchanged context and is drawn dashed: add the callers and callees a reviewer needs to see what the change touches.
- Node `state`: `new`, `changed`, `removed` or `context`. Default: `changed` with a change, `context` without. Edge `state`: `new`, `removed` or `same`.
- `t` labels a wire in one or two words. It shows only where the gap between boxes can hold it, so put what matters in the node's `sub`.
- `src` says where the map comes from. Default: "From reading the code."

## Review

- `first`: up to 6 `{ "at": "path:line", "t": "what to check there", "change": "id" }`, in the order to read them. Put behaviour changes and anything hard to undo first.
- `risks`: up to 6 `{ "level": "medium", "t": "what could break", "sub": "for whom, and what limits it", "change": "id" }`.
- `unchecked`: up to 6 sentences: what no test, run or check covered. Always say it; an empty list claims everything was checked.
- `heading` and `say`: the review screen's title and one sentence.

## Limits

6 changes, 4 code pieces per change, 80 lines per piece, 6 notes per piece, 5 map layers of 5 nodes, 16 nodes, 24 edges, 6 places to look first, 6 risks, 8 checks, 6 unchecked.
