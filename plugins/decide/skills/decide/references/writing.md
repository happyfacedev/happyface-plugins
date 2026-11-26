# Writing and design rules

## Screens

- **One decision per screen**, with the question as the heading. GOV.UK found this feels simpler even with more clicks.
- **The picture is the answer.** People choose while looking at the result, not from a list below it.
- **Everything needed to decide fits one desktop screen.** Short pictures and short facts keep it there.
- **Always allow "Not sure".** End with a summary where any answer can be changed.
- **Ask less.** Decide what you can, batch what is safe, skip what an earlier answer settles.

## What the change is about

A choice makes sense only once the person knows what it changes. Answer that before the options, in this order:

- **The change**: `about.what` names the feature or fix the decisions belong to, and `why` says why it comes up now.
- **The place**: `where` gives `path:line` and what lives there, so the person who knows the code sees the spot, and the one who doesn't learns it.
- **Today**: `context.now` says in one sentence what happens now. Its real code or output waits behind "Show the code".
- **The code each option writes**: when options change code, show each as a `diff` of the lines it would write, with line numbers, and call it a proposed change.

The summary repeats what each chosen option will do, so the person approves the whole change, not a list of names.

## Pictures

- **What happens now is real.** Copy it from a run, the code or a test. Say which in `src`.
- **The alternatives are mock-ups** in the product's own style, showing only what `does` says. Tell the user which details you invented.
- **Same kind, same command, on every option**, so the only difference is the answer. Highlight only that.

## Words

Plain language, following ISO 24495-1.
- **Heading: a question of 12 words or fewer**, subject first: "Should merge check every argument first?"
- **Sentences of 20 words or fewer**, one idea each. Front-load them.
- **Name what the person sees**: the command, the message, the file. Put IDs in `ref`.
- **`does` is exact and complete.** It is what you will do, and it goes into the copied answer.
- **Facts are a few words**: "Small", "Low", "Easy". Be honest when the recommended option costs more.
- **`recWhy` is the reason**, not a restatement. No filler.

## Design

- Atkinson Hyperlegible for text, JetBrains Mono for code, without ligatures, so `!=` never becomes one glyph. Each question has its own color (blue, violet or orange). The about screen uses the dark band of visualize's change brief. Teal always means recommended or done, rose always means permanent. The skin is shared with visualize. Both themes are tokens.
- Keys 1–4 pick, Enter continues. Focus is always visible. Phones stack the options.

## Sources

- GOV.UK question pages: https://design-system.service.gov.uk/patterns/question-pages
- GOV.UK, one thing per page: https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- GOV.UK check answers: https://design-system.service.gov.uk/patterns/check-answers
- NN/g, F-shaped reading: https://nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Plain language checklist: https://opentextbc.ca/plbpsvpp/chapter/a-plain-language-checklist/
- Baymard, line length: https://baymard.com/blog/line-length-readability
