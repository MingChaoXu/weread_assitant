---
name: weread-obsidian
description: Sync WeRead shelf state, reading progress, visible book content, and note-ready Markdown into a local workspace using the user's logged-in Chrome session. Use when the user wants to inspect WeRead bookshelf status, capture book metadata or text for a specific book, or prepare WeRead material for Obsidian, Feishu, or OpenClaw note workflows.
---

# WeRead Obsidian Skill

Use this skill when the user wants a bridge between WeRead and their note workflow.

## What this skill does

- Pulls shelf-level data from `https://weread.qq.com/web/shelf` through the user's existing Chrome login session
- Captures a single book's page state and visible reading content into JSON
- Exports Markdown files that are easy for Obsidian, Feishu bots, or OpenClaw to consume

## Preconditions

1. The user must already be logged into WeRead in Chrome.
2. Chrome remote debugging must be enabled at `chrome://inspect/#remote-debugging`.
3. The local CDP proxy from the `web-access` skill must be available on `http://localhost:3456`.

## Workflow

1. Pull the bookshelf snapshot:

```bash
npm run weread:fetch-shelf
```

This writes `output/weread/shelf.json`.

2. Capture one book:

```bash
npm run weread:fetch-book -- --book-url "https://weread.qq.com/..."
```

This writes `output/weread/books/<slug>.json`.

3. Export Markdown for note-taking:

```bash
npm run weread:export-obsidian -- --shelf output/weread/shelf.json --book output/weread/books/<slug>.json
```

This writes Markdown under `output/obsidian/`.

4. Publish Markdown into Obsidian through `obsidian-cli`:

```bash
npm run weread:publish-obsidian -- --dir output/obsidian
```

This writes notes into the default vault configured in `obsidian-cli`, or the vault passed with `--vault`.

## Operating guidance

- Default to shelf sync plus one-book content sync. Do not bulk-export every book's full text unless the user explicitly asks and understands the risk.
- Prefer using a real book URL captured from the shelf or copied from the browser instead of guessing a reader URL pattern.
- The content capture is intentionally conservative: it records visible or scroll-loaded text from a single page flow so the downstream note system can summarize, annotate, and ask follow-up questions.
- If WeRead changes its DOM, inspect the saved JSON first; the scripts already preserve raw page clues for follow-up repairs.

## Outputs

- `output/weread/shelf.json`: bookshelf snapshot, candidate book links, storage hints, page diagnostics
- `output/weread/books/*.json`: per-book metadata, visible content, notes/highlights candidates, diagnostics
- `output/obsidian/*.md`: Markdown notes ready for vault ingestion or LLM conversation
- Obsidian vault notes: created through `obsidian-cli create --overwrite`

## Downstream use

- Obsidian can ingest the Markdown files directly.
- If `obsidian-cli` is available, publish the generated Markdown into the vault and let OpenClaw continue working from vault notes instead of raw export files.
- Feishu or OpenClaw can read the generated Markdown or JSON and turn it into prompts, summaries, or reading-note conversations.
- The recommended pattern is: sync data locally first, then let the downstream agent reason over files instead of talking to WeRead live on every request.
