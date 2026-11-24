---
name: visualize
description: Explain something as a visual storyboard page, one idea per step, each with a bold color panel, one plain sentence and a large true picture. Use when the user wants to understand a concept ("what is X?", "explain X", "I don't get X"), a pull request or set of changes, how a system or process works, or what the agent just did and why, or says "run /visualize". Not for choosing between options (that is decide), and not for a fact one line of chat answers.
---

# visualize: understand it step by step

`references/format.md` is the input format. Follow the page as built; don't restyle it.

## Procedure

1. **Get it right first.**
   - A concept: check anything that may have changed, such as records, status or prices, against a source. Compute numbers instead of recalling them.
   - A change or something you did: read the real diff, files, logs and test output. Count from them.
2. **Find the one thing the person should leave with.** Every step must lead there. Cut the rest.
3. **Plan 3–8 steps**, one idea each, so each step makes the next one obvious.
   - A concept: something familiar, the puzzle in it, the idea that solves it, what it means, what is still unknown.
   - A change: how big it is, what changes one idea at a time, then where to look first and what could break.
   - Your own work: the result, how it works, what it costs the person, what was checked and what was not.
4. **Write each step:** a heading of 7 words or fewer, one or two short sentences with the key words in `**bold**`, one big number if a number matters, and a picture.
5. **Make the picture true.** Compute it or copy it. Never draw data by eye. `src` says which it is: "Computed", "From git", "From a real run", "Illustration". When no built-in picture explains the idea, write a custom one (see the format); an interactive one is worth it for the hardest step.
6. **Give color a meaning.** The same idea keeps the same color through the story. Rose is for risk or the open claim, teal for what is known or safe.
7. **Separate what is known from what is claimed.** Use the `status` picture. "Reported" must not look like "Proven", and "Not checked" is always shown. Put links in `sources`.
8. **Build:** write `visualize.json` in your scratchpad, never in the repository, then run `node "${CLAUDE_SKILL_DIR}/scripts/build.mjs" visualize.json story.html [custom.js]`, where `${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Fix every error and warning. If there is a custom picture and you can take a screenshot, look at it once for clipped or overlapping text; otherwise check its coordinates against the format's margins.
9. **Show it.** If you can publish an artifact, publish `story.html` with a short `<title>` and the icon `book`. Otherwise run `open story.html` (`xdg-open` on Linux) and give the full path.
10. **Say in a few lines:** the one-sentence answer, which pictures are computed or copied and which are illustrations, and anything you could not check.

## Writing

Plain words, short sentences, one idea each. Explain a term the moment it appears, or don't use it. Say what things do before what they are called. No filler.
