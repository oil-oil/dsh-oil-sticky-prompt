<p align="center">
  <img src="./assets/readme/zh/hero.svg" alt="dsh-oil-sticky-prompt：把距离视口最近的用户提问钉在 DeepSeek Harness 对话顶部" width="100%">
</p>

<p align="center">
  <a href="./README.md">English</a> | 中文
</p>

<p align="center">
  <a href="https://github.com/oil-oil/dsh-oil-sticky-prompt/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/oil-oil/dsh-oil-sticky-prompt/ci.yml?style=flat-square&amp;label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-3167E3?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-3167E3?style=flat-square">
</p>

`dsh-oil-sticky-prompt` 是 DeepSeek Harness 的独立 Web 插件。长回复往上滚时，距离当前滚动窗口最近的那条用户提问，会收成通栏摘要钉在对话顶部。

原文气泡保持原来的布局。插件不编辑消息、不分叉会话，也不恢复工作区文件。

## 安装

```sh
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt
```

重启 Harness，然后硬刷新浏览器。对话里至少有一条用户消息后，往上滚动：提问离开滚动区顶部时，摘要条会出现。

需要可复现安装时，在仓库地址后加上提交 SHA：

```sh
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt#fa3241a
```

## 会做什么

- 钉住已经越过 `[data-conversation-scroll]` 顶部的最后一条用户提问。
- 只用一条覆盖层，两条话题不会互相抢位置、来回闪。
- 吸顶前把原文换行收成空格，再做两行省略。
- 上去时从原气泡滑到通栏；下来时淡出，不再拉伸文字。
- 点击摘要条会回到原来的气泡。

## 不会做什么

- 不替换 `UserStyleBubble`，也不替换会话标题栏。
- 不编辑、撤回或分叉会话日志。
- 不保存设置。没有设置卡，也没有 Host 存储。

## 更新和卸载

```sh
npx @deepseek-ai/dsh plugin --profile web remove dsh-oil-sticky-prompt
npx @deepseek-ai/dsh plugin --profile web add github:oil-oil/dsh-oil-sticky-prompt
```

两条命令之后都要重启 Harness。

## 兼容

这一版对应 DeepSeek Harness `>=0.2.0-rc.1 <0.3.0-0`，并在 `0.2.1-rc.2` 上验证通过。Harness 仍处于 Developer Preview。

Harness 0.2.x 会拒绝安装「声明了不接受当前版本的 `@deepseek-ai/dsh*` peer 或 `engines.dsh`」的插件。这一版声明了 0.2.x 的 `engines.dsh`，同时不再依赖已被移除的 `@deepseek-ai/dsh-client-runtime`，因此插件管理器可以正常安装。

客户端按 0.2.x 的聊天 DOM 读取内容：用户行是 `[data-chat-flow-kind="user"]`，内容包在 `[data-slot="conversation.chat.node"]` 内，prompt 气泡是该容器里带 `_bubble` 后缀的类名。旧版的 `data-time-hover-root` 包裹层已不存在。

## 开发

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

本地 profile：

```sh
npx @deepseek-ai/dsh plugin --profile web add file:$PWD
```

改源码后重新构建 `lib/`。GitHub 仓库里已经包含 `lib/index.js` 和 `lib/client.js`，安装时不需要 `allowBuilds`。

## 许可

[MIT](LICENSE)

---

这是独立的社区项目，与 DeepSeek 没有从属或背书关系。
