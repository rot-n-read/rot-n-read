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

Fill lines word-by-word up to `max_chars_per_line` characters, breaking only at word boundaries. Number of lines per chunk = user's **rows** setting.

#### Example

Settings: `max_chars_per_line = 50`, `rows = 3`

Source text:
> "of me that is completely different from Mother; the Betty that holds Subaru's hand is several hundreds times better than that, I suppose.Roswaal: That is what I'm refeeerring~ to."

Line 1: `of me that is completely different from Mother;` (47 chars — next word would overflow, wrap)
Line 2: `the Betty that holds Subaru's hand is several` (46 chars)
Line 3: `hundreds times better than that, I suppose.Roswaal` (50 chars)

### 30% rule

"Roswaal" is the start of a new sentence on the last line, and less than 30% of that sentence fits in this chunk → push it to the next chunk.

Final chunk:
```
of me that is completely different from Mother;
the Betty that holds Subaru's hand is several
hundreds times better than that, I suppose.
```

## Timing

```
chunk_duration_ms = (word_count_in_chunk / wpm) × 60000 / speed_multiplier
```

Example: 23 words, 100 WPM, 1× speed → `(23 / 100) × 60000 = 13,800ms`

Display chunk → wait duration → display next chunk.

## Orientation change / resize

- Recalculate `max_chars_per_line` (text area width changes)
- Re-chunk from current `word_offset` position
- Debounce 300ms

## Position tracking

Track progress as **word_offset** (not chunk index — chunks are ephemeral and change on resize/settings change). Persist `word_offset` + `percent` to IndexedDB.
