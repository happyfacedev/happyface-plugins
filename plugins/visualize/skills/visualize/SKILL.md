---
name: visualize
description: Explain something as a visual page. A concept becomes a storyboard, one idea per step, each with a bold color panel, one plain sentence and a large true picture. A code change (a pull request, commit, branch, diff, or what the agent just did) becomes a change brief, an overview of everything it does, then one screen per change with its real code, where to look first, and every file. Use when the user wants to understand a concept ("what is X?", "explain X", "I don't get X"), a pull request or set of changes ("what does this PR do?", "walk me through this change"), how a system or process works, or what the agent just did and why, or says "run /visualize". Not for choosing between options (that is decide), and not for a fact one line of chat answers.
---

# visualize: understand it at a glance

Two forms share one look. Pick by what you explain:

- **A concept, a system or a process** → a **storyboard**: `references/format.md`.
- **A code change** (a pull request, a commit, a branch, a diff, your own work) → a **change brief**: `references/change-format.md`. A change is read for what it does and where to look, so it gets an overview first and real code, never a metaphor.

Follow the page as built; don't restyle it.

## A concept: the storyboard

1. **Get it right first.** Check anything that may have changed, such as records, status or prices, against a source. For "is it solved, true or current", use your most thorough and fresh search, look for news from this month, and then search for the opposite of what you believe; one quick search has missed week-old news. Open the primary source. Show the date you checked. Compute numbers instead of recalling them.
2. **Find the one thing the person should leave with.** Every step must lead there. Cut the rest.
3. **Plan 3–8 steps**, one idea each, so each step makes the next one obvious: something familiar, the puzzle in it, the idea that solves it, what it means, what is still unknown. For your own work that is not a code change: the result, how it works, what it costs the person, what was checked and what was not.
4. **Write each step:** a heading of 7 words or fewer, one or two short sentences with the key words in `**bold**`, one big number if a number matters, and a picture.
5. **Make the picture true.** Compute it or copy it. Never draw data by eye. `src` says which it is: "Computed", "From git", "From a real run", "Illustration". When no built-in picture explains the idea, write a custom one (see the format); an interactive one is worth it for the hardest step.
6. **Give color a meaning.** The same idea keeps the same color through the story. Rose is for risk or the open claim, teal for what is known or safe.
7. **Separate what is known from what is claimed.** Use the `status` picture. "Reported" must not look like "Proven", and "Not checked" is always shown. Put links in `sources`.
8. **Build:** write `visualize.json` in your scratchpad, never in the repository, then run `node "${CLAUDE_SKILL_DIR}/scripts/build.mjs" visualize.json story.html [custom.js]`, where `${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Fix every error and warning. If there is a custom picture and you can take a screenshot, look at it once for clipped or overlapping text; otherwise check its coordinates against the format's margins.
9. **Show it.** If you can publish an artifact, publish `story.html` with a short `<title>` and the icon `book`. Otherwise run `open story.html` (`xdg-open` on Linux) and give the full path.
10. **Say in a few lines:** the one-sentence answer, which pictures are computed or copied and which are illustrations, and anything you could not check.

## A code change: the brief

1. **Get the diff and what ran.** Work in your scratchpad.
   - A pull request: `gh pr diff <n> > change.diff`, and `gh pr view <n> --json title,body,state,author,baseRefName,headRefName,url,commits,statusCheckRollup`.
   - A branch or a commit: `git diff <base>...<head> > change.diff`, or `git show <sha> --format= > change.diff`.
   - Your own work: `git add -N` new files, then `git diff HEAD > change.diff`.
   - `node "${CLAUDE_SKILL_DIR}/scripts/change.mjs" change.diff` lists every file with its counts and the line ranges of its hunks.
   - Read the description, the commits and the diff itself, and the tests that cover it. Take check results from the run, never from memory.
2. **Say what it does in one sentence**, as the people who use it would notice it: the `answer`.
3. **Split it by intent into 1–6 changes**, never by file or folder. One change is one reason the code changed. Commits often mark the seams. Order them for reading: what changes behaviour first, then what the rest builds on, then what builds on it. Tests and docs go with the change they cover. More than six intents: group the small ones under one change.
4. **Write each change:** a title of 8 words or fewer that says what it does, `what` in one or two sentences, `before` and `after` as a user or caller sees them, its risk, and its files. Give `why` only from the PR, an issue, a commit or a spec. Set `basis` to what before and after rest on.
5. **Pick the code that carries each change:** 1–3 ranges of the diff that a reviewer must read, 40 lines or fewer each, with a note under the line that matters. The build copies the lines from the diff.
6. **Account for every file.** A file in no change goes in `others` with its role: generated, version, mechanical, tests, docs, config. The build fails on any file left over.
7. **Draw the map** when the change touches two or more parts: layers in the direction calls flow, each changed part in its change's color, and, dashed, the unchanged callers and callees a reviewer needs.
8. **Write the review:** where to look first (`path:line` and what to check there, in order), what could break and for whom, the checks with their real outcome, and what nothing checked.
9. **Build:** write `change.json` in your scratchpad, never in the repository, then run `node "${CLAUDE_SKILL_DIR}/scripts/build.mjs" change.json brief.html --diff change.diff`. Fix every error and warning: a range with no change in it, a file left over, a note on a line not shown.
10. **Show it** as for a storyboard, with the icon `code`, except that a brief of a private repository is opened locally unless the person asks to publish it.
11. **Say in a few lines:** the one-sentence answer, how many changes and files, which checks ran and which did not, and what you could not check.

## Writing

Plain words, short sentences, one idea each. Explain a term the moment it appears, or don't use it. Say what things do before what they are called. No filler.

For a change, name code as it is written, in backticks, and say what it does in the same sentence. Before and after describe what someone sees or calls, not the implementation. No metaphors: the code is the picture.
