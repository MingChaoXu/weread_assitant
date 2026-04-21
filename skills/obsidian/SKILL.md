---
name: obsidian
description: Read, search, create, update, and publish notes in the Obsidian vault using Hermes file tools first and safe vault-aware workflows.
version: 1.2.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [obsidian, notes, markdown, vault, knowledge-management]
    related_skills: [weread-obsidian]
---

# Obsidian Vault

Use this skill whenever the user wants to read, search, create, organize, or update Obsidian notes.

## What this skill does

- Reads notes from the local Obsidian vault
- Searches note filenames and note content
- Creates new Markdown notes safely
- Updates existing notes without clobbering unrelated content
- Supports ingesting generated Markdown from other workflows into the vault
- Encourages durable note structure: frontmatter, headings, tags, and wikilinks
- Reuses the note-publishing pattern established by `weread-obsidian`: generate locally first, then publish into the vault
- Provides fixed-section update rules, merge strategies, and reusable templates for AI-generated notes

## Vault location

Primary source:

- `OBSIDIAN_VAULT_PATH` environment variable (for example in `~/.hermes/.env`)

Fallback:

- `~/Documents/Obsidian Vault`

Always treat the vault path as potentially containing spaces.

## Preferred Hermes tool usage

For Obsidian tasks, prefer Hermes file tools over raw shell commands.

### Read a note

Use `read_file(path)`.

### Search notes

Use `search_files()`.

- Search by note name:
  - `search_files(pattern='*keyword*.md', target='files', path=VAULT)`
- Search by note content:
  - `search_files(pattern='keyword', target='content', path=VAULT, file_glob='*.md')`

### Create or overwrite a note

Use `write_file(path, content)`.

### Update an existing note

Use `patch()` for targeted edits instead of rewriting the whole file whenever possible.

### Inspect vault structure

Use `search_files(pattern='*', target='files', path=VAULT)` rather than `find`/`ls`.

## Core workflow

### 1. Resolve the vault path

Determine the effective vault path from:

1. `OBSIDIAN_VAULT_PATH`
2. fallback `~/Documents/Obsidian Vault`

### 2. Search before creating

Before creating a new note, first search for:

- exact filename match
- likely related note names
- relevant content matches

This avoids accidental duplicates like:

- `AI Notes.md`
- `AI-Notes.md`
- `AI Notes 2.md`

### 3. Prefer structured note updates

When editing an existing note:

- preserve frontmatter
- preserve user-authored sections unless explicitly replacing them
- append under a clear heading when the user asks to “add” rather than “rewrite”
- use stable headings such as:
  - `## Summary`
  - `## Key Points`
  - `## Reflections`
  - `## Related Notes`

### 4. Generate locally first, then publish

Adopt the same operational pattern used in `weread-obsidian`:

1. generate Markdown or structured content locally
2. inspect or refine it
3. write or patch the final vault note

This is the preferred pattern for AI-generated knowledge workflows because it reduces accidental destructive edits.

## Fixed section update strategy

When notes are regenerated repeatedly, treat sections as belonging to one of three classes.

### A. Regenerated sections

These can be fully replaced when new content is produced:

- `## Summary`
- `## Key Points`
- `## Steps`
- `## Transcript Summary`
- `## AI Analysis`
- `## Source Metadata`

Rule:
- Replace the entire section body but keep the heading stable.

### B. Append-only sections

These should only grow unless the user explicitly asks for cleanup:

- `## Reflections`
- `## Follow-up Questions`
- `## Action Items`
- `## Related Notes`
- `## Revision Log`

Rule:
- Append new bullets or dated blocks.
- Do not delete prior user-written entries by default.

### C. User-protected sections

These should never be overwritten automatically:

- `## Personal Notes`
- `## Manual Edits`
- `## Commentary`
- any section bounded by markers such as:
  - `<!-- USER_START -->`
  - `<!-- USER_END -->`

Rule:
- Preserve verbatim unless the user explicitly requests replacement.

## Content merge strategy

When merging newly generated note content into an existing note, use this priority order.

### 1. Preserve frontmatter keys unless explicitly replaced

- Keep existing `aliases`, `created`, custom metadata, and user tags.
- Merge tags by union rather than replacement when possible.
- Update `updated` timestamp if the note is materially changed.

### 2. Replace generated sections by heading

If the note already contains a stable generated heading like `## Summary`, replace only that section body.

### 3. Append user-facing incremental content

For sections like reflections or action items:

- append dated bullets
- avoid duplicate adjacent content
- prefer concise additions over full rewrites

### 4. Preserve protected blocks

If protected markers exist, do not edit within them.

### 5. Fallback behavior when headings do not exist

If the target heading does not exist:

- create it at the logical place in the note
- do not reorder unrelated user content aggressively

## Merge heuristics

Use these practical heuristics during updates:

- If new content is clearly a refined version of an existing generated section, replace that section only.
- If new content adds interpretation, put it under `## AI Analysis` or `## Reflections` instead of replacing transcript-like content.
- If content may be regenerated later, isolate user additions into stable append-only sections.
- If uncertain whether content is user-authored or generated, preserve it.

## Recommended note template

For general knowledge notes, prefer:

```md
---
title: Note Title
tags:
  - tag1
  - tag2
source: 
created: 2026-04-21
updated: 2026-04-21
---

# Note Title

## Summary

...

## Key Points

- ...
- ...

## Details

...

## Related Notes

- [[Another Note]]
```

For lighter-weight notes, frontmatter is optional if the user prefers simpler Markdown.

## Video learning note template

Use this template for AI-generated notes from videos such as Douyin, YouTube, courses, or lectures:

```md
---
title: {{title}}
type: video-learning-note
platform: {{platform}}
source_url: {{source_url}}
author: {{author}}
created: {{created_date}}
updated: {{updated_date}}
tags:
  - video-note
  - {{platform_tag}}
  - {{topic_tag}}
---

# {{title}}

## Source Metadata
- Platform: {{platform}}
- Author: {{author}}
- URL: {{source_url}}
- Duration: {{duration}}
- Processed At: {{processed_at}}

## Summary
{{summary}}

## Key Points
- {{point_1}}
- {{point_2}}
- {{point_3}}

## Steps
1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

## Examples
- {{example_1}}

## Quotes
> {{quote_1}}

## Action Items
- {{action_1}}

## Reflections
<!-- USER_START -->
- 
<!-- USER_END -->

## Related Notes
- [[{{related_note}}]]
```

### Update policy for video notes

- Replace `Source Metadata`, `Summary`, `Key Points`, `Steps`, `Examples`, and `Quotes` when regenerating from source artifacts.
- Append to `Action Items` only if the new items are materially different.
- Never overwrite the `Reflections` block bounded by user markers.

## Common tasks

### Read one note

- Resolve vault path
- Search for likely filename if the exact path is not given
- Read with `read_file()`

### Create a new note

- Search for duplicates first
- Choose the destination folder if the user mentioned one
- Use `write_file()` with full Markdown content

### Append reflections or updates

- Read the note first
- If a target heading exists, append under that heading
- Otherwise add a new section at the end
- Use `patch()` instead of rewriting unrelated content

### Turn generated content into a vault note

When another workflow produces Markdown, such as reading notes, video summaries, or research synthesis:

1. save or inspect the generated Markdown locally
2. map it to the target vault path
3. write it into the vault
4. preserve user-added reflection blocks if the note may be regenerated later

This mirrors the robust publish-back workflow in `weread-obsidian`.

## Natural-language triggers

Use this skill when the user says things like:

- “帮我记到 Obsidian”
- “创建一篇笔记”
- “查一下我 Obsidian 里有没有这个主题”
- “把这段内容整理进现有笔记”
- “把生成的 Markdown 发布到我的笔记库”
- “在某个笔记后面追加内容”
- “把这个视频整理成 Obsidian 笔记”

## Safety and quality rules

- Do not create duplicate notes if a matching note already exists
- Do not overwrite large notes blindly when a patch is sufficient
- Do not delete user content unless explicitly instructed
- Preserve manually written reflection sections when updating generated notes
- When note placement is ambiguous, make a reasonable default only if low-risk; otherwise inspect vault structure first
- For generated notes, keep user-editable content isolated in protected or append-only sections

## Good patterns

### Add content to an existing note

1. Search for note
2. Read note
3. Patch specific heading or append new section
4. Verify resulting structure

### Publish AI-generated summaries

1. Generate Markdown outside the vault if needed
2. Review structure
3. Write into vault path
4. Add tags and wikilinks

### Maintain stable generated notes

For notes regenerated from external sources, keep a predictable layout such as:

- metadata/frontmatter
- generated summary sections
- user reflections section
- related links

If the note is republished later, preserve the user reflections section.

## Relationship to `weread-obsidian`

`weread-obsidian` is a specialized pipeline for WeRead-to-Obsidian sync. This `obsidian` skill is the general-purpose vault workflow.

Borrow from `weread-obsidian` these principles:

- local-first generation
- least-privilege writes
- publish finalized Markdown into the vault
- preserve user-authored reflections when regenerating notes
- prefer stable note formats that downstream agents can reason about

## Outcome

After using this skill, the vault should remain:

- searchable
- non-duplicative
- structured
- safe for future regeneration and updates
- friendly to downstream AI workflows
