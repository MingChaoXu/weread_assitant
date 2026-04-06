# WeRead Assistant

将微信读书网页端的书架、阅读状态、可见正文内容与 Obsidian/OpenClaw 工作流连接起来的本地工具集。

这个项目当前已经完成一条真实可跑通的链路：

1. 复用你本机 Chrome 中已登录的微信读书会话
2. 抓取书架列表、书籍链接、阅读进度、笔记数量、可见正文块
3. 导出为结构化 JSON
4. 生成适合 Obsidian 的 Markdown 笔记
5. 通过 `obsidian-cli` 直接写入你的 Obsidian vault

## 项目目标

这个仓库不是通用爬虫，而是一个偏个人知识管理的桥接层：

- 面向微信读书网页端的真实登录态采集
- 优先产出可供 AI 和笔记系统消费的中间数据
- 让 OpenClaw、飞书 bot、Obsidian 能基于本地文件继续工作

推荐工作方式不是每次都实时访问微信读书，而是：

1. 先同步一次数据到本地
2. 再让 OpenClaw/飞书/Obsidian 消费本地文件
3. 需要更新时重新同步

## 当前能力

### 1. 书架同步

从 `https://weread.qq.com/web/shelf` 拉取：

- 书名
- `bookId`
- 微信读书阅读链接
- 封面链接
- 当前页面可见的书架快照

输出文件：

- `output/weread/shelf.json`
- `output/obsidian/weread-shelf.md`

### 2. 单书抓取

针对某一本书的 `web/reader/<bookId>` 页面抓取：

- 书名
- 作者
- 阅读进度
- 笔记数量
- 阅读时长
- 当前章节线索
- 当前页面可见的正文块
- 划线/想法候选

输出文件：

- `output/weread/books/<slug>.json`
- `output/obsidian/books/<slug>.md`

### 3. Obsidian 发布

将导出的 Markdown 通过 `obsidian-cli` 直接发布到 Obsidian vault。

当前模板已经支持两类阅读场景：

- 卡片笔记：金句卡片、问题卡片、永久笔记草稿
- 阅读面板：阅读进度、当前章节、本轮待办

## 目录结构

```text
.
├── README.md
├── package.json
├── skills/
│   └── weread-obsidian/
│       ├── SKILL.md
│       ├── references/
│       │   └── data-contract.md
│       └── scripts/
│           ├── cdp-client.mjs
│           ├── export-obsidian.mjs
│           ├── fetch-book.mjs
│           ├── fetch-shelf.mjs
│           └── publish-obsidian.mjs
└── output/
    ├── obsidian/
    └── weread/
```

## 运行前提

### 必需条件

1. 本机安装 Node.js 22+
2. Chrome 已打开，并已登录微信读书
3. 在 `chrome://inspect/#remote-debugging` 中启用 remote debugging
4. 本机可运行 `web-access` skill 对应的 CDP proxy

### 如果要写入 Obsidian

还需要：

1. 已安装 `obsidian-cli`
2. 已设置默认 vault，或在命令里显式传 `--vault`

当前环境里已验证过：

- `obsidian-cli` 可用
- 默认 vault 为 `claw_notes`

## 快速开始

### 1. 拉取书架

```bash
npm run weread:fetch-shelf
```

成功后会得到：

- `output/weread/shelf.json`

### 2. 抓一本文字内容

从书架输出中挑一本书的 reader URL，例如：

```bash
npm run weread:fetch-book -- --book-url "https://weread.qq.com/web/reader/a583244072027d22a58423a"
```

成功后会得到：

- `output/weread/books/从零开始学缠论-缠中说禅核心技术分类精解.json`

### 3. 导出为 Obsidian Markdown

```bash
npm run weread:export-obsidian -- \
  --shelf output/weread/shelf.json \
  --book "output/weread/books/从零开始学缠论-缠中说禅核心技术分类精解.json"
```

成功后会得到：

- `output/obsidian/weread-shelf.md`
- `output/obsidian/books/从零开始学缠论-缠中说禅核心技术分类精解.md`

### 4. 写入 Obsidian vault

```bash
npm run weread:publish-obsidian -- --dir output/obsidian --vault claw_notes
```

当前会发布成以下 note 路径：

- `WeRead/weread-shelf`
- `WeRead/books/<书名>`

## 可用命令

### `npm run weread:fetch-shelf`

抓取微信读书书架页面并保存为 JSON。

### `npm run weread:fetch-book -- --book-url "<url>"`

抓取单本书页面。

常用可选参数：

- `--output <path>`：自定义输出路径
- `--output-dir <dir>`：自定义输出目录
- `--scrolls <n>`：滚动次数，决定正文采样深度
- `--keep-open`：调试时保留浏览器标签页

### `npm run weread:export-obsidian`

将 JSON 转为 Markdown。

常用参数：

- `--shelf <path>`
- `--book <path>`
- `--output-dir <dir>`

### `npm run weread:publish-obsidian`

通过 `obsidian-cli` 写入 Obsidian。

常用参数：

- `--dir <dir>`：批量发布目录
- `--file <file>`：只发布单个 Markdown
- `--vault <name>`：指定 vault
- `--prefix <prefix>`：控制 note 路径前缀，默认 `WeRead`

## 生成的数据格式

更细的数据契约见：

- `skills/weread-obsidian/references/data-contract.md`

核心产物如下。

### `output/weread/shelf.json`

包含：

- `capturedAt`
- `page`
- `books`
- `rawCandidates`

其中 `books` 是后续抓单书最常用的输入。

### `output/weread/books/<slug>.json`

包含：

- `capturedAt`
- `sourceUrl`
- `page`
- `metadata`
- `toc`
- `notes`
- `content`

其中：

- `metadata` 提供书名、作者、简介、封面
- `notes` 提供划线/评论/状态候选
- `content.blocks` 提供当前页面采集到的正文块

## 当前 Obsidian 模板设计

单书导出的 Markdown 模板分为几个区块：

### 1. 读书进度面板

展示：

- 作者
- 进度
- 当前章节
- 笔记数
- 阅读时长
- 最近同步时间

### 2. 本轮待办

用于让你在一次阅读会话中快速进入状态，比如：

- 复述当前章节
- 选一条金句展开
- 完成一条永久笔记
- 回答一个问题卡片

### 3. 金句卡片

从抓取内容里挑出更适合沉淀的句子，并留出三个空槽：

- 我的理解
- 能连接到哪条旧笔记
- 可以指导什么行动

### 4. 问题卡片

将阅读内容转成值得继续追问的问题，方便你与 OpenClaw 或自己继续展开。

### 5. 永久笔记草稿

为每次阅读自动准备几条可继续加工的永久笔记框架。

### 6. 待清洗原料

保留抓取到的原始划线/想法候选，方便后续二次清洗。

## 已完成的真实测试

这个仓库已经用你的真实环境完成过一轮端到端测试：

- 成功连接 Chrome debug 端口
- 成功抓取微信读书书架
- 成功识别 50 本书
- 成功抓取至少 1 本书的阅读状态与正文内容
- 成功导出 Markdown
- 成功写入 `claw_notes` vault

测试样例文件：

- `output/weread/shelf.json`
- `output/weread/books/从零开始学缠论-缠中说禅核心技术分类精解.json`
- `output/obsidian/weread-shelf.md`
- `output/obsidian/books/从零开始学缠论-缠中说禅核心技术分类精解.md`

## 已知限制

### 1. 当前抓取的是“可见内容优先”

这不是一个完整电子书导出器，而是页面可见内容采样器。

这意味着：

- 能拿到当前阅读区域内容
- 能拿到部分进度和笔记状态
- 不保证能一次性拿完整本书全文

### 2. DOM 结构变化会影响提取效果

微信读书如果调整前端结构，以下内容可能需要重新适配：

- 目录项识别
- 划线/想法区分
- 当前章节推断

### 3. 划线候选仍有少量噪声

当前模板已经把这些内容降级为“待清洗原料”，但还可以继续优化。

### 4. GitHub 发布尚未完成

当前目录已经初始化为本地 git 仓库，但还没有配置远程仓库地址，因此推送前还需要补上目标 GitHub repo。

## 推荐下一步

最值得继续做的有四项：

1. 优化金句与永久笔记标题生成，让它更像人工写作
2. 把“真实划线”和“正文摘录”进一步分开
3. 增加批量抓取多本书的编排流程
4. 将 OpenClaw/飞书对话 prompt 固化为更稳定的模板

## 开发说明

这个项目目前是一个轻量脚本仓库，没有引入额外 npm 依赖，依赖的都是系统侧能力：

- Node.js
- Chrome debugging
- `obsidian-cli`
- 本地 `web-access` skill 对应脚本

如需调试某个脚本，优先直接运行 `node` 命令或 npm scripts。

## 许可与隐私提醒

这个项目会访问你的真实微信读书登录态，并将抓取结果写到本地文件中。

请注意：

- 不要随意提交包含隐私阅读数据的 `output/` 目录
- 不要在不了解后果的情况下批量抓取大量内容
- 自动化访问网页存在被站点识别的风险
