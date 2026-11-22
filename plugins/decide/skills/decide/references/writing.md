# Writing and design rules

Every rule here comes from a source below. The format is fixed: follow it; don't redesign it.

## One question per screen

- **One decision per screen**, with the question as the page heading (h1). Never show a list of questions to answer at once. Source: GOV.UK question pages and "one thing per page". Their research found step-by-step screens felt simpler even on large screens and with more clicks.
- **Back at the top, Continue at the bottom left.** Show a caption like "cli · Question 3 of 51". Don't show a navigator that lists every question.
- **Say why you are asking** (`why`), and **allow "Not sure"**. Both are GOV.UK rules.
- **End with Check your answers**: every answer, a Change link on each, then Copy answers. Source: GOV.UK check answers pattern.
- **Offer one shortcut on the start page**: "Accept all my recommendations and only check the summary".

## The picture comes first

- Every question shows **Today** and **Change** side by side, above the explanation. Use the same kind of panel and the same command on both sides, so the only thing that differs is the answer.
- **Highlight only the line the question is about** (at most 3). Everything else is context, and may be `muted` or elided with "…".
- **Today is real.** Copy it from a run, the code or a test. Never paraphrase an error message on a Today panel. If you could not run it, take it from the tests or the spec, and say so in your reply.
- **Change is a mock-up.** It follows the product's existing style (same prefixes, same summary lines) and shows only what `change` says. A detail you had to decide yourself, such as a new exit code or a message, you list in your reply so the person can push back.
- **Each option says which picture it gives** ("You get the Today picture"). Picking an option outlines its panel and dims the other one.

## Words

Use plain language, following ISO 24495-1 and common plain-language checklists.
- **The heading is the question**, ending in "?", 12 words or fewer. Start it with the subject: "Should merge check every argument first?", not "About argument checking in merge".
- **`today`, `why`, `change`: one or two sentences each**, 20 words or fewer per sentence. One idea per sentence.
- **Use everyday words. Name things by what the person sees**: the command, the message, the file. Don't name the internals: no function names, module names or "the parser".
- **Front-load every line.** NN/g found that readers notice the first two words of headings, labels and list items most.
- **Write IDs in `ref`, never in the heading.**
- **Keep `change` concrete and complete.** It is the exact thing that happens on a Change answer, and the summary repeats it.
- **Keep `recWhy` to the reason, not a restatement**: "Merging untested breaks INV-002."
- **No filler**: no "worth noting", no "it's important to", no em-dash asides.

## Design

The page is `assets/page.html` and `assets/app.js`. Keep it as it is. Its choices, and the sources behind them:
- **One column for text, about 65 characters wide** (40rem). Only the comparison uses the full width of 62rem. Sources: Baymard and Bringhurst give 45–75 characters per line; WCAG 1.4.8 caps it at 80.
- **18px body text at 1.55 line height**, in Atkinson Hyperlegible, a typeface designed for legibility. IDs and code are in JetBrains Mono.
- **One accent color, plus a green "Recommended" color and an amber "Change" color.** Both themes are defined as tokens, and terminals stay dark in both.
- **A thick yellow focus ring** in the GOV.UK style. Big radio rows, with keys 1–9 to pick an option.
- **Progressive disclosure, one level deep**: a group's items open to show their details, and nothing nests further.

## Sources

- GOV.UK Design System, Question pages: https://design-system.service.gov.uk/patterns/question-pages
- GOV.UK, One thing per page: https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- GOV.UK Design System, Check answers: https://design-system.service.gov.uk/patterns/check-answers
- Nava, HealthCare.gov eligibility form case study: https://www.navapbc.com/uploads/Structuring%20a%20complex%20eligibility%20form%20for%20HealthCare.gov.pdf
- NN/g, F-shaped pattern for reading web content: https://nngroup.com/articles/f-shaped-pattern-reading-web-content/
- ISO 24495-1:2023 plain language; plain language checklist: https://opentextbc.ca/plbpsvpp/chapter/a-plain-language-checklist/
- Progressive disclosure: https://ui-patterns.com/patterns/ProgressiveDisclosure
- Baymard, line length: https://baymard.com/blog/line-length-readability
