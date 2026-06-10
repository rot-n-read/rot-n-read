# Contributing to Rot n Read

Thanks for wanting to help make brainrot reading slightly less degenerate.

## How to Contribute

1. **Fork** the repo.
2. **Clone** your fork locally.
3. Create a **branch** for your change: `git checkout -b my-feature`
4. Make your changes following the coding standards below.
5. **Test** on mobile (this is a mobile-first app).
6. **Commit** with a clear message.
7. **Push** and open a Pull Request.

## Coding Standards

- **No npm, no build tools, no frameworks.** Vanilla JS only.
- Variables/functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- No PascalCase anywhere.
- If code repeats, extract it into a function.
- Top-level functions should read like a paragraph — they call other functions, not implement logic inline.

## What We'd Love Help With

### Priority Problems

- **Reducing video file size** — Current MP4 clips are heavy. We'd love alternatives: looping CSS animations, HTML Canvas-based brainrot (bouncing balls, particle effects, etc.), or heavily compressed short loops. The goal is more brainrot content without bloating the app.
- **Natural-sounding TTS improvements** — TTS is now implemented using the Web Speech API. We still want more human-sounding voices and better voice selection/fallback behavior (without paid APIs or heavy dependencies).

### Other Ideas

- More background video/animation types
- Epub / txt / mobi format support
- Chapter detection
- Better sentence splitting for non-English text
- Accessibility improvements
- Bug fixes on weird PDFs

## What to Avoid

- Adding npm dependencies
- Changing the core reading engine without discussion
- UI redesigns without an open issue first

## Reporting Bugs

Open an issue with:
- Device & browser info
- Steps to reproduce
- What you expected vs what happened
- Screenshot if applicable

## AI Assistance Policy

This project was built with AI assistance (Claude). AI-assisted PRs are accepted and encouraged — but:

You must manually review the code you submit. AI-generated code that is clearly unreviewed (nonsensical variable names, dead code, hallucinated imports) will be rejected.

## Review Turnaround

The maintainer is employed full-time. Pull requests are reviewed manually and with AI assistance, typically on weekends only. Please be patient — your contribution is appreciated.

## Code of Conduct

Be respectful, be helpful, have fun. That's it.
