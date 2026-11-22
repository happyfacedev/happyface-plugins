# happyface plugins

The Claude Code marketplace for happyface. Add it once; every plugin listed here updates itself when you start a session.

| Plugin | Install | What it is | Lives in |
| --- | --- | --- | --- |
| `spec` | `spec@happyface` | The spec workflow: a project specification, tickets, and staged agent roles | [happyfacedev/spec](https://github.com/happyfacedev/spec), `plugin/` |
| `flutter` | `flutter@happyface` | Flutter conventions and pattern skills (`flutter:flutter-skill` and friends) | [happyfacedev/flutter-skill](https://github.com/happyfacedev/flutter-skill) |
| `decide` | `decide@happyface` | A visual, one-question-at-a-time decision review page | this repo, `plugins/decide/` |

## Install

The repositories are private, so git on your machine needs stored GitHub credentials first:

```sh
gh auth login
gh auth setup-git
```

Then, in Claude Code:

```text
/plugin marketplace add happyfacedev/happyface-plugins
/plugin install spec@happyface
/plugin install flutter@happyface
/plugin install decide@happyface
```

**Turn on auto-update once:** `/plugin` > Marketplaces > happyface > enable auto-update. Claude Code leaves it off for every marketplace that isn't Anthropic's, and a marketplace can't switch it on for you. With it on, Claude Code checks for new commits in the background after each session starts. Without it, run `/plugin marketplace update happyface`.

A project set up with spec registers this marketplace in its `.claude/settings.json`, so a teammate who trusts the folder gets it added automatically; they still install the plugin once with `claude plugin install spec@happyface --scope project`.

## How updates work

No plugin here sets a `version`. Claude Code then versions each plugin by its git commit, so every push to a plugin's repository is an update. Don't add a `version` to an entry or a `plugin.json`: users would stay on that version until someone bumps it.

## Add a plugin

1. Give the plugin a `.claude-plugin/plugin.json` with `name` and `description`, and put its skills under `skills/<skill>/SKILL.md`. Skill names are namespaced by the plugin: `<plugin>:<skill>`.
2. Add an entry to `.claude-plugin/marketplace.json`:
   - a plugin in its own repository: `{ "source": "github", "repo": "happyfacedev/<repo>" }`;
   - a plugin in a folder of another repository: `{ "source": "git-subdir", "url": "happyfacedev/<repo>", "path": "<folder>" }`;
   - a small plugin kept here: `"./plugins/<name>"`.
3. Run `claude plugin validate .` and push.
