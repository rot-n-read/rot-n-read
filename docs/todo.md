# Rot n Read — Todo

## 1 — TTS Integration

- [x] Web Speech API integration (speechSynthesis)
- [x] TTS reads current chunk aloud
- [x] Exact sync: next chunk only appears after speech completes (or timer fallback)
- [x] TTS voice picker (list available local voices)
- [x] TTS on/off toggle
- [x] Pace respects TTS — if speech takes longer than WPM timing, speech wins

## 2 — Polish & Edge Cases

- [ ] Browser detection → "unsupported" page with FOSS browser suggestions
- [ ] Graceful degradation on low-end devices (reduce video quality, skip second video in Ultra Brainrot)
- [ ] Error handling (corrupt PDF, empty file, storage full)
- [ ] Loading states and transitions
- [ ] Keyboard shortcuts (space = pause, arrows = rewind/forward)
- [ ] Final responsive QA across devices

## 3 — Future (Post-MVP)

- [ ] Chapter detection and chapter navigation
- [ ] Epub / txt / mobi format support
- [ ] Online TTS character voices (API integration)
- [ ] More video types / user-uploaded background videos
- [ ] Reading stats (books finished, time spent, WPM history)
- [ ] Swipe up in reader to skip to next video clip (like Instagram reels), swipe down to go back
