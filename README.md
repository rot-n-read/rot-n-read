# Rot n Read

> Brainrot your way through books.

A speed-reading PWA for the brainrot generation. Upload a PDF, set your pace, and watch the text stream across your screen while familiar dopamine-bait videos loop in the background. It won't fix your attention span, but it'll trick your brain into finishing a book.

**v1.0.0**

## Features

- **PDF Upload & Parsing** — Drop in a text-based PDF, get a readable book in seconds. Headers/footers stripped automatically.
- **Adaptive Text Engine** — Text chunks are built at read time based on your screen width, font, font size, and rows setting. Rotate your phone? It re-chunks instantly.
- **Playback Controls** — Play, pause, rewind, forward, speed adjustment (0.5×–2×). Reading pace in WPM.
- **Background Videos** — Subway Surfers, Mmm Fingers, or whatever keeps your lizard brain happy. Loops silently behind the text.
- **4 Layout Modes** — Immersive (text over video), Primary (text top), Secondary (text bottom), Ultra Brainrot (two videos simultaneously).
- **Zen Mode** — One tap hides all UI. Tap again to bring it back.
- **Per-Book Settings** — Skip characters, custom titles, cover colors.
- **Offline-First PWA** — Installable, service worker caches everything, optional button to download all videos for full offline use.
- **Smart Sentence Splitting** — Handles abbreviations (Mr., Dr., etc.), decimals, ellipses. 30% rule prevents awkward sentence fragments at chunk boundaries.

## Getting Started

### Users

1. Open [https://rot-n-read.example.com](https://rot-n-read.example.com) on your phone.
2. Tap the **⋮** (three dots) menu in your browser.
3. Tap **"Add to Home Screen"** or **"Install App"**.
4. Open the app from your home screen — it runs fullscreen, no browser UI.
5. Upload a PDF, set your pace, hit play. Done.

### Developers

Serve the directory with any static file server:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000/home.html` in a modern browser (Chromium-based recommended).

No build step. No npm install. No dependencies beyond PDF.js (bundled).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS |
| PDF Parsing | [PDF.js](https://mozilla.github.io/pdf.js/) (bundled) |
| Storage | IndexedDB (books), localStorage (settings) |
| Offline | Service Worker, Cache API |
| Install | PWA (manifest.json) |

## Project Structure

```
├── home.html          # Library / book grid
├── reader.html        # Reading screen
├── settings.html      # App settings
├── book_options.html  # Per-book options
├── about.html         # About page
├── unsupported.html   # Browser fallback
├── css/style.css      # All styles
├── js/
│   ├── app.js         # Theme, SW registration
│   ├── home.js        # Library UI, PDF upload
│   ├── reader.js      # Chunking engine, playback
│   ├── settings.js    # Settings persistence
│   ├── book_options.js# Per-book settings
│   ├── storage.js     # IndexedDB operations
│   ├── video.js       # Video player logic
│   └── pdf_handler.js # PDF text extraction
├── lib/pdfjs/         # Bundled PDF.js
├── videos/            # Background video clips
├── images/            # Icons, logos
├── sw.js              # Service worker
└── manifest.json      # PWA manifest
```

## How the Reader Engine Works

1. **Upload** — PDF text is extracted (minus headers/footers), split into sentences, stored in IndexedDB.
2. **Open** — Reader measures text area width, calculates max characters per line using worst-case character width (`0.9×m + 0.1×i`), builds chunks on the fly.
3. **Display** — Each chunk shows for `(word_count / wpm) × 60000 / speed` milliseconds, then advances.
4. **Resize/Rotate** — Re-chunks from current word offset. Position tracked as word offset, not chunk index.

See [Reader Engine Skills](docs/reader.engine.skills.md) for the full spec.

## Settings

| Setting | Options | Persisted |
|---------|---------|-----------|
| Theme | Dark / Light / Auto | localStorage |
| Orientation | Portrait / Landscape / Auto | localStorage |
| Layout | Immersive / Primary / Secondary / Ultra | localStorage |
| Overlay Opacity | 0–100% | localStorage |
| Video | Per-type selection | localStorage |
| Pace (WPM) | 10–300 | localStorage |
| Font | System / Georgia / Verdana / Monospace | localStorage |
| Font Size | 12–32px | localStorage |
| Rows of Text | 1–6 | localStorage |
| Skip Characters | Per-book | IndexedDB |

## Browser Support

Modern Chromium-based browsers (Chrome, Edge, Brave, Arc). Firefox works but may lack orientation lock and some PWA install features.

## Note on Video Footage

All gameplay footage used in the background videos was captured by the original developer. Yes, he is skilled at his games.

## Contributing

Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support the Project

The developer built this app because he needed one like this. There are no plans to monetize it — no ads, no subscriptions, no tracking.

## License

[GPL-3.0](LICENSE) — This project is free and open source. Use it, modify it, distribute it. Keep it open. Just don't blame us when you finish a 400-page novel in one sitting and realize you retained nothing.
