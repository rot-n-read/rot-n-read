# Rot n Read

> Brainrot your way through books

A speed-reading app for the brainrot generation. Upload a book, pick your pace, and let the text stream across your screen while familiar dopamine-bait animations play alongside it. It won't fix your attention span, but it'll keep your eyes busy enough to actually finish a book.

## AI Instructions

> **Never start coding without approval. Answer queries first and only then, you code once you have approval.**

## Coding Standards

- If any piece of code is repeated, wrap it in a function and call it
- Store functions in appropriate files
- Main/top-level functions should only call other functions and the entire code must be read like a paragraph
- Minimal to No 3rd party Dependencies. Especially no npm installs.
- On every change, bump the version in `sw.js` (cache name) and `about.html` (display)

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | `snake_case` | `token_name`, `handler_path` |
| Functions | `snake_case` | `load_handler()`, `run_tests()` |
| Classes | `snake_case` separators | `token_store` — **NO PascalCase** |
| Constants | `UPPER_SNAKE_CASE` | `MAX_ITERATIONS`, `DB_PATH` |
| Files/dirs | `snake_case` | `processor.py`, `src/engine/` |

- Minor version increments naturally: `x.9` → `x.10` → `x.11` (no reset to 0). Never bump the major version unless explicitly told to mark a major release.

## Reference Docs

- [PWA Skills](docs/pwa.skills.md)
- [Reader Engine Skills](docs/reader.engine.skills.md)
- [Todo](todo.md)