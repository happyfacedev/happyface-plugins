# happyface plugins

The Claude Code marketplace for happyface. Add it once; every plugin listed here updates itself when you start a session.

| Plugin | Install | What it is | Lives in |
| --- | --- | --- | --- |
| `spec` | `spec@happyface` | The spec workflow: a project specification, tickets, and staged agent roles | [happyfacedev/spec](https://github.com/happyfacedev/spec), `plugin/` |
| `flutter` | `flutter@happyface` | Flutter conventions and pattern skills (`flutter:flutter-skill` and friends) | [happyfacedev/flutter-skill](https://github.com/happyfacedev/flutter-skill) |
| `decide` | `decide@happyface` | Make decisions on a visual page, one at a time, by seeing what the change is about and what each option means | this repo, `plugins/decide/` |
| `visualize` | `visualize@happyface` | Understand a concept as a visual storyboard, or a code change as a brief: what it does, its real code, where to look, every file | this repo, `plugins/visualize/` |
| `visualize-interactive` | `visualize-interactive@happyface` | The same pages, where you click any part, a line of code included, and a small locked-down model answers | this repo, `plugins/visualize-interactive/` |

## Install

In Claude Code:

```text
/plugin marketplace add happyfacedev/happyface-plugins
/plugin install spec@happyface
/plugin install flutter@happyface
/plugin install decide@happyface
/plugin install visualize@happyface
/plugin install visualize-interactive@happyface
```

**Turn on auto-update once:** `/plugin` > Marketplaces > happyface > enable auto-update. Claude Code leaves it off for every marketplace that isn't Anthropic's, and a marketplace can't switch it on for you. With it on, Claude Code checks for new commits in the background after each session starts. Without it, run `/plugin marketplace update happyface`.

A project set up with spec registers this marketplace in its `.claude/settings.json`, so a teammate who trusts the folder gets it added automatically; they still install the plugin once with `claude plugin install spec@happyface --scope project`.

### Codex and GitHub Copilot CLI

The same marketplace works in both:

```sh
codex plugin marketplace add happyfacedev/happyface-plugins
codex plugin add flutter@happyface     # also spec, decide, visualize and visualize-interactive

copilot plugin marketplace add happyfacedev/happyface-plugins
copilot plugin install flutter@happyface
```

`spec` installs its skills in both, but its hooks and staged agents are built for Claude Code, so its enforcement is not supported elsewhere.

Claude Code and Codex read `.claude-plugin/marketplace.json`; Copilot reads `.github/plugin/marketplace.json`, because it rejects `git-subdir` sources. Keep both in step, and use `url` rather than `github` sources in the first: Codex skips `github`.

## How updates work

No plugin here sets a `version`. Claude Code then versions each plugin by its git commit, so every push to a plugin's repository is an update. Don't add a `version` to an entry or a `plugin.json`: users would stay on that version until someone bumps it.

## Add a plugin

1. Give the plugin a `.claude-plugin/plugin.json` with `name` and `description`, and put its skills under `skills/<skill>/SKILL.md`. Skill names are namespaced by the plugin: `<plugin>:<skill>`.
2. Add an entry to `.claude-plugin/marketplace.json`, and its Copilot equivalent to `.github/plugin/marketplace.json`:
   - a plugin in its own repository: `{ "source": "url", "url": "https://github.com/happyfacedev/<repo>.git" }`;
   - a plugin in a folder of another repository: `{ "source": "git-subdir", "url": "happyfacedev/<repo>", "path": "<folder>" }`;
   - a small plugin kept here: `"./plugins/<name>"`.
3. Run `claude plugin validate .` and `node scripts/check.mjs`, then push.

## Checks

`node scripts/check.mjs` builds every example of decide, visualize and visualize-interactive and fails on any error or warning. It also confirms that visualize and visualize-interactive hold identical copies of the files they share (`change.mjs`, `change.js`, `change.css`, `change-format.md` and the change example): each plugin installs on its own, so a shared file lives in both. Edit one copy, then copy it over.
