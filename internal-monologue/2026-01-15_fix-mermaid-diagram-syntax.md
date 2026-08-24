# 2026-01-15 — Validate and fix architecture diagram Mermaid syntax

## What was asked
Validate all three architecture diagrams for parser errors and fix any found.

## Issues found and fixed

### class-diagram.md
- Removed `PK` and `FK` suffixes from member lines — Mermaid classDiagram does not support trailing annotations; they cause parse errors.

### sequence-diagram.md
- Removed `<br/>` from all `participant … as …` alias labels — HTML tags are not valid in participant declarations.
- Removed `<br/>` from all message arrow labels and note text.
- Escaped all bare `{` / `}` in message labels to `#lbrace;` / `#rbrace;` — curly braces are interpreted as template syntax by the parser.
- Simplified `INSERT Booking(...)` label to remove parentheses and quoted strings.

### use-case-diagram.md
- Replaced `&lbrace;` / `&rbrace;` with `#lbrace;` / `#rbrace;` in R5 and R6 node labels — `&lbrace;` is not a recognised HTML entity in Mermaid flowchart labels.

## Rule noted
`.bob/rules/basic-rules.md` updated to require mental parse before outputting Mermaid.
