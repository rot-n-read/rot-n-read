# Reader Engine — Design Document

## Upload

Split book text into **sentences** (handling abbreviations, decimals, ellipses) and store the sentences array in IndexedDB. No pre-chunking at upload time.

## Chunking (at read time)

### Calculate max characters per line

Given the text area width, current font, and font size:

```
worst_case_char_width = (0.9 × m_width) + (0.1 × i_width)
max_chars_per_line = floor(text_area.clientWidth / worst_case_char_width)
```

This value changes between portrait and landscape — recalculate on orientation change.

### Build chunks from sentences

The **rows** setting is a maximum cap, not an exact target. Each chunk contains one or more complete sentences, packed greedily until adding the next sentence would exceed `max_rows`.

**Algorithm:**

1. Start an empty chunk.
2. Take the next sentence (or sentence fragment from a previous break).
3. Simulate laying out `chunk_text + sentence` word-by-word and count the rows needed.
4. If it fits within `max_rows` → add the sentence to the chunk; continue to step 2 for the next sentence.
5. If it doesn't fit and the chunk already has content → emit the chunk; the current sentence starts the next chunk.
6. If it doesn't fit and the chunk is empty (single sentence exceeds `max_rows`) → find the last **natural break point** within the sentence that fits, break there, emit that fragment as the chunk.

**Natural break points** (in priority order, last-fitting wins):
- After a comma, semicolon, em-dash, or en-dash (break after the punctuation)
- Before a coordinating or subordinating conjunction at a word boundary: `and`, `but`, `or`, `yet`, `still`, `so`, `nor`, `for`, `although`, `while`, `because`, `since`, `if`, `when`, `however`, `though`, `unless`

If no natural break fits, force-break at word boundary at `max_rows`.

#### Example

Settings: `max_chars_per_line = 50`, `rows = 3`

Sentences:
1. `"It was a bright cold day in April."`  (6 rows if max_chars=10, fits in 1 row at 50)
2. `"The clocks were striking thirteen."`

Both sentences fit together within 3 rows → one chunk:
```
It was a bright cold day in April. The clocks
were striking thirteen.
```

If sentence 2 were long enough to push past 3 rows, the chunk would end after sentence 1 alone.

#### Long sentence break example

Sentence: `"He walked to the store, and she stayed home, but nobody came back."`

If this exceeds `max_rows` on its own, natural break positions are:
- after `","` at "store," → `"He walked to the store,"`
- before `"and"` → `"He walked to the store,"`  *(same region)*
- after `","` at "home," → `"He walked to the store, and she stayed home,"`
- before `"but"` → `"He walked to the store, and she stayed home,"`

The last natural break that fits within `max_rows` is chosen.

## Timing

```
chunk_duration_ms = (word_count_in_chunk / wpm) × 60000 / speed_multiplier
```

Example: 23 words, 100 WPM, 1× speed → `(23 / 100) × 60000 = 13,800ms`

Display chunk → wait duration (or TTS completion) → display next chunk.

## TTS integration

When TTS is enabled, each chunk is spoken as a single `SpeechSynthesisUtterance`. Because chunks are sentence-aligned (breaking only at natural pause points), the boundaries between utterances fall at natural speech pauses — commas, conjunctions, or sentence ends — minimising audible gaps.

## Orientation change / resize

- Recalculate `max_chars_per_line` (text area width changes)
- Re-chunk from current `word_offset` position
- Debounce 300ms

## Position tracking

Track progress as **word_offset** (not chunk index — chunks are ephemeral and change on resize/settings change). Persist `word_offset` + `percent` to IndexedDB.
