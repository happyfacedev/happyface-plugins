---
name: decide
description: Turn a set of open questions or decisions into a visual review page the user answers one question at a time. Each question shows a Today versus Change picture (a terminal, a file or a flow), why it matters and a recommendation. The page ends with a check-your-answers summary and a Copy answers block the user pastes back, and you then act on it. Use when the user has several decisions to make, asks to review open questions, recommendations, findings, drafts or trade-offs, says "run /decide", or when you are about to ask more than three questions in a row. Not for one quick question; ask that directly.
---

# decide: a visual, one-question-at-a-time decision review

The user has chosen this format and wants it exactly as it is. Follow it every time. Don't restyle the page, merge screens, or put questions in a list. `references/writing.md` gives the rules and the research behind them, and `references/format.md` gives the input format.

## When

- **Use it** for several open questions or decisions, from any source: review findings, spec questions, a migration's choices, product or pricing options, audit results, or drafts to confirm.
- **Use it instead of a long chat message** whenever you would otherwise ask more than three questions in a row.
- **Skip it** for one or two quick questions. Ask those in chat.

## Procedure

1. **Collect the decisions.** For each, find:
   - what happens today, and its source: a run, the code, a test, a doc;
   - the concrete alternative;
   - why it matters;
   - your recommendation.
   
   Group the decisions where the subject has natural groups (modules, areas, files). If something else needs a yes or no as a whole, like approving a module, give that group a `review`. If there is a pick-any list, such as bugs to file, put it in `extras`.
2. **Write each question in plain words.** `references/writing.md` has the rules:
   - `h` is the question, ending in "?", 12 words or fewer;
   - `today`, `why` and `change` are one or two short sentences each;
   - `change` is the exact outcome of a Change answer;
   - IDs go in `ref`.
3. **Draw the picture for every question.** Every question gets `visual.today` and `visual.after`, without exception.
   - Use a terminal for commands, a file for files, docs or messages, and steps for anything that happens over time.
   - **Today is real.** Copy it from a run, or from the code or tests. Highlight only the line the question is about.
   - **After is a mock-up of `change`**, in the product's own style. Give it the same kind and command as Today.
   - For many questions, let a subagent gather the Today outputs and draft the After panels against the schema in `references/format.md`. Then spot-check a few of them against the source yourself.
4. **Write `decide.json`** in your scratchpad, never in the repository.
5. **Build:** `node "${CLAUDE_SKILL_DIR}/scripts/build.mjs" decide.json review.html`, where `${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md.
   - Fix every error it reports.
   - Fix its warnings as well: they flag headings, sentences or lines that are too long.
6. **Show it.** Publish `review.html` as an artifact, the user's private claude.ai page. Give it a short name as its `<title>` and the icon `checklist`.
   - **If publishing is unavailable or refused**, run `open review.html` on macOS (`xdg-open` on Linux) to open it in the browser. Give the full absolute path.
   - **Answers are kept in the browser**, keyed by the title, so a rebuild with the same title keeps them.
7. **Tell the user in a few lines:**
   - how many questions there are, and how your recommendations split, for example "34 Change, 9 Docs only, 8 Keep";
   - which Today panels you checked yourself against a real run;
   - any details in the After panels you decided yourself, such as an exit code or a message;
   - that they press **Copy answers** at the end and paste the block into the chat.
   
   Then stop and wait for them.
8. **Act on the pasted answers.** Read the block line by line:
   - `keep`: no change.
   - `change`: the change described in that question's `change` text.
   - `docs`: fix the wording only.
   - `unsure` or `unanswered`: raise it with the user. Don't decide it yourself.
   - Group verdicts: `approve` means confirm the group. `look` means read the named parts with the user first. `hold` means leave the group as it is.
   - Extras: the IDs listed after the colon are the selected ones.
   
   Confirm what you will do in one short list, then do it. Anything irreversible needs the user's yes, as usual.

## Changing the format

Keep `assets/page.html`, `assets/app.js` and `scripts/build.mjs` as they are. If the user asks for a change to the format itself, change these files, keep `references/` in step with them, and rebuild a sample from `references/example.json` to check the result.
