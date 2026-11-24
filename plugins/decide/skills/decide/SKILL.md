---
name: decide
description: Build a visual page where the user makes decisions by seeing what each option would mean. One decision per screen; each option is a clickable picture (a terminal, a file, steps or numbers) with its work, risk and whether it can be undone, plus a recommendation. The user pastes the answers back and you act on them. Use when a decision is hard to picture or costly to get wrong, when the user is unsure what to choose or asks to compare options, when you propose several changes, findings or trade-offs, or says "run /decide". A single hard decision is enough. Not for a quick question that one line of chat settles.
---

# decide: choose by seeing the result

`references/format.md` is the input format and `references/writing.md` the writing rules. Follow the page as built: don't restyle it, merge screens, or list questions.

## When

- **Use it** when words alone won't show the difference: behaviour, output, files, processes, prices, designs to compare.
- **Use it** for one decision that is costly to get wrong, or for several at once.
- **Skip it** when the answer is obvious, cheap to change, or quicker to ask in chat.

## Procedure

1. **Collect the decisions, then cut them.**
   - Find what happens now and its source, the real alternatives, the cost of each, and your recommendation.
   - Decide for yourself whatever the user doesn't need to decide.
   - Put small, safe, easily undone changes in `batch`: one screen to accept them together. Nothing permanent goes there.
   - Put the decision that matters most first. Use `showIf` for a question an earlier answer can settle.
2. **Write each question** with 2–4 `options`. Keeping things as they are is an option when it is a real choice. Every option gets:
   - a name of 6 words or fewer, and `does`: exactly what choosing it does;
   - a picture: terminal, file, steps or numbers, the same kind across the question;
   - `src`: where the picture comes from, such as "From a real run", "From reading the code" or "Mock-up";
   - `facts`: Work, Risk and Undo, in a few words each;
   - `permanent: true` if it cannot be undone.
3. **Keep the pictures true.** What happens now is copied from a run, the code or a test, never paraphrased. The rest are mock-ups in the product's own style that show only what `does` says. Highlight only the lines that differ. Facts are your estimates unless you measured them.
4. **Write `decide.json`** in your scratchpad, never in the repository.
5. **Build:** `node "${CLAUDE_SKILL_DIR}/scripts/build.mjs" decide.json review.html`, where `${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Fix every error and warning.
6. **Show it.** If you can publish an artifact, publish `review.html` with a short `<title>` and the icon `checklist`. Otherwise run `open review.html` (`xdg-open` on Linux) and give the full path. Answers stay in the browser across rebuilds; a question whose content changed opens again.
7. **Tell the user in a few lines:** how many decisions, which pictures you checked against a real run, which details and facts you estimated, and that they press **Copy answers** and paste the block here. Then stop and wait.
8. **Act on the pasted answers.** Each is the question, `[question id = option id]`, then the chosen outcome.
   - Do exactly what the chosen option's text says. Read the notes: they override the option.
   - `Not sure`, `Unanswered` and `Talk about`: raise it. Don't decide it yourself.
   - `Skipped`: an earlier answer settled it.
   - `PERMANENT: confirm first`: get a separate yes in chat before doing it.

   Say what you will do in one short list, then do it.

## Changing the page

Change `assets/` and `scripts/build.mjs` only when the user asks for a change to the format. Keep `references/` in step, and rebuild `references/example.json` to check.
