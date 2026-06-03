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
- **Natural-sounding TTS** — The Web Speech API voices sound robotic. Help finding or integrating more human-sounding, natural language synthesis (without requiring paid APIs) would be huge.

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

## Code of Conduct

Don't be a dick. That's it. Be respectful, be helpful, have fun.
