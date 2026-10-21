<p align="center">
  <img src="./assets/readme/hero.svg" alt="dsh-oil-sticky-prompt: pin the nearest user prompt to the top of a DeepSeek Harness transcript" width="100%">
</p>

<p align="center">
  English | <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/oil-oil/dsh-oil-sticky-prompt/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/oil-oil/dsh-oil-sticky-prompt/ci.yml?style=flat-square&amp;label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-3167E3?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-3167E3?style=flat-square">
</p>

`dsh-oil-sticky-prompt` is a standalone Web plugin for DeepSeek Harness. While you scroll a long reply, the nearest user prompt stays at the top of the conversation as a compact full-width bar.

Original bubbles keep their layout. The plugin does not edit messages, fork sessions, or restore workspace files.

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt
```

Restart Harness, then hard-refresh the browser. After at least one user message exists, scroll the transcript: when a prompt leaves the top of the scrollport, the bar appears.

To lock a reproducible install, append a commit SHA:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt#fa3241a
```

## What it does

- Pins the last user prompt that has crossed the top of `[data-conversation-scroll]`.
- Uses one overlay bar, so two topics cannot fight and flicker.
- Flattens original line breaks to spaces before the two-line clamp.
- Morphs from the source bubble into the bar on the way up; fades out on the way down.
- Jumps back to the original bubble when the bar is clicked.

## What it does not do

- It does not replace `UserStyleBubble` or the session header.
- It does not edit, rewind, or fork the session log.
- It does not persist settings. There is no Settings card and no Host storage.

## Update and remove

```sh
npx @deepseek-ai/dsh plugin --profile web remove dsh-oil-sticky-prompt
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt
```

Restart Harness after either command.

## Compatibility

This release targets DeepSeek Harness `>=0.2.0-rc.1 <0.3.0-0`; it is verified on `0.2.1-rc.2`. DeepSeek Harness is still in Developer Preview.

Harness 0.2.x rejects an install whose plugin declares `@deepseek-ai/dsh*` peers (or `engines.dsh`) that do not accept the running version. This release declares `engines.dsh` for the 0.2.x line, so the plugin manager accepts it; it no longer depends on the removed `@deepseek-ai/dsh-client-runtime` package.

The client reads the 0.2.x chat DOM: user rows are `[data-chat-flow-kind="user"]`, their content sits behind `[data-slot="conversation.chat.node"]`, and the prompt bubble is the `_bubble` class inside it. The old `data-time-hover-root` wrapper no longer exists.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

For a local profile:

```sh
npx @deepseek-ai/dsh plugin --profile web add file:$PWD
```

Rebuild `lib/` after source changes. The published GitHub tree includes `lib/index.js` and `lib/client.js`, so install does not need `allowBuilds`.

## License

[MIT](LICENSE)

---

This is an independent community project and is not affiliated with or endorsed by DeepSeek.
