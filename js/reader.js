"use strict";

var reader_state = {
  book: null,
  sentences: [],
  chunks: [],
  chunk_index: 0,
  word_offset: 0,
  total_words: 0,
  playing: false,
  timer: null,
  wpm: 150,
  speed: 1,
  max_chars_line: 50,
  rows: 6,
  font: "system-ui",
  font_size: 18
};

var SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/* ─── Init ─── */

function init_reader() {
  apply_reader_layout();
  apply_reader_text_styles();
  var book_id = get_book_id_from_url();
  if (!book_id) {
    window.location.href = "home.html";
    return;
  }
  init_video_player();
  load_reader_book(book_id);
  listen_orientation_change();
  setup_zen_mode();
  setup_reset_button();
}

function get_book_id_from_url() {
  var params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function load_reader_book(book_id) {
  get_book(book_id).then(function (book) {
    if (!book) {
      window.location.href = "home.html";
      return;
    }
    reader_state.book = book;
    reader_state.sentences = filter_skip_chars(book.sentences || [], book.skip_chars || "");
    reader_state.word_offset = book.word_offset || 0;
    reader_state.wpm = parseInt(localStorage.getItem("pace") || "150", 10);
    reader_state.rows = parseInt(localStorage.getItem("rows") || "6", 10);
    reader_state.font = localStorage.getItem("font") || "system-ui";
    reader_state.font_size = parseInt(localStorage.getItem("font_size") || "18", 10);
    reader_state.total_words = count_total_words(reader_state.sentences);
    init_tts();
    compute_max_chars_line();
    build_chunks();
    seek_to_word_offset(reader_state.word_offset);
    set_book_title(book.title);
    display_current_chunk();
    update_progress();
    setup_controls();
  });
}

/* ─── Character width measurement ─── */

function compute_max_chars_line() {
  var text_area = document.querySelector(".reader__text-area");
  if (!text_area) {
    reader_state.max_chars_line = 50;
    return;
  }
  var area_width = text_area.clientWidth;

  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  var font_str = reader_state.font_size + "px " + reader_state.font;
  ctx.font = font_str;

  var m_width = ctx.measureText("m").width;
  var i_width = ctx.measureText("i").width;
  var worst_case_char_width = (0.9 * m_width) + (0.1 * i_width);

  reader_state.max_chars_line = Math.max(10, Math.floor(area_width / worst_case_char_width));
}

/* ─── Chunk building from sentences ─── */

function build_chunks() {
  var max_chars = reader_state.max_chars_line;
  var max_rows = reader_state.rows;
  var sentences = reader_state.sentences;

  var chunks = [];
  var sentence_idx = 0;
  var char_offset_in_sentence = 0;

  while (sentence_idx < sentences.length) {
    var chunk = build_one_chunk(sentences, sentence_idx, char_offset_in_sentence, max_chars, max_rows);
    if (chunk.lines.length === 0) {
      sentence_idx++;
      char_offset_in_sentence = 0;
      continue;
    }
    chunks.push(chunk);
    sentence_idx = chunk.next_sentence_idx;
    char_offset_in_sentence = chunk.next_char_offset;
  }

  reader_state.chunks = chunks;
}

function build_one_chunk(sentences, start_sentence, start_char_offset, max_chars, max_rows) {
  var sentence_idx = start_sentence;
  var char_offset = start_char_offset;
  var chunk_text = "";
  var word_count = 0;

  while (sentence_idx < sentences.length) {
    var sentence = sentences[sentence_idx];
    var raw = sentence.substring(char_offset);
    var leading_spaces = raw.match(/^\s*/)[0].length;
    var remaining = raw.substring(leading_spaces).replace(/\s+$/, "");

    if (remaining.length === 0) {
      sentence_idx++;
      char_offset = 0;
      continue;
    }

    var sep = chunk_text.length > 0 ? " " : "";
    var candidate = chunk_text + sep + remaining;

    if (count_rows_for_text(candidate, max_chars) <= max_rows) {
      chunk_text = candidate;
      word_count += count_words_in_text(remaining);
      sentence_idx++;
      char_offset = 0;
    } else if (chunk_text.length > 0) {
      break;
    } else {
      var split = split_at_natural_pause(remaining, max_chars, max_rows);
      chunk_text = split.text;
      word_count = count_words_in_text(chunk_text);
      var new_offset = char_offset + leading_spaces + split.end_pos;
      while (new_offset < sentence.length && sentence[new_offset] === " ") new_offset++;
      if (new_offset >= sentence.length) {
        sentence_idx++;
        char_offset = 0;
      } else {
        char_offset = new_offset;
      }
      break;
    }
  }

  var lines = layout_to_lines(chunk_text, max_chars, max_rows);
  return {
    lines: lines,
    text: lines.join("\n"),
    word_count: word_count,
    next_sentence_idx: sentence_idx,
    next_char_offset: char_offset
  };
}

function layout_to_lines(text, max_chars, max_rows) {
  var lines = [];
  var current_line = "";
  var remaining = text.trim();

  while (remaining.length > 0) {
    if (lines.length >= max_rows) break;
    var space_left = max_chars - current_line.length;

    if (space_left <= 0) {
      lines.push(current_line);
      current_line = "";
      continue;
    }

    var fit = fit_words_in_space(remaining, space_left);

    if (fit.fitted.length === 0) {
      if (current_line.length > 0) {
        lines.push(current_line);
        current_line = "";
      } else {
        var hb = hard_break_at(remaining, max_chars);
        lines.push(hb.fitted);
        remaining = hb.rest;
      }
    } else {
      current_line = current_line.length > 0 ? current_line + fit.fitted : fit.fitted;
      remaining = fit.rest;
    }
  }

  if (current_line.trim().length > 0 && lines.length < max_rows) {
    lines.push(current_line);
  }

  return lines;
}

function count_rows_for_text(text, max_chars) {
  return layout_to_lines(text, max_chars, 9999).length;
}

function split_at_natural_pause(text, max_chars, max_rows) {
  var breaks = find_natural_break_positions(text);

  for (var i = breaks.length - 1; i >= 0; i--) {
    var pos = breaks[i];
    var prefix = text.substring(0, pos).trim();
    if (prefix.length === 0) continue;
    if (count_rows_for_text(prefix, max_chars) <= max_rows) {
      return { text: prefix, end_pos: pos };
    }
  }

  var forced_lines = layout_to_lines(text, max_chars, max_rows);
  var forced_text = forced_lines.join(" ");
  var end_pos = find_pos_after_words(text, count_words_in_text(forced_text));
  if (end_pos <= 0) end_pos = text.length;
  return { text: forced_text, end_pos: end_pos };
}

function find_natural_break_positions(text) {
  var positions = [];
  var i, pos, match;

  for (i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === "," || ch === ";" || ch === "—" || ch === "–") {
      pos = i + 1;
      while (pos < text.length && text[pos] === " ") pos++;
      if (pos < text.length) positions.push(pos);
    }
  }

  var conj_re = /\b(and|but|or|yet|still|so|nor|for|although|while|because|since|if|when|however|though|unless)\b/gi;
  while ((match = conj_re.exec(text)) !== null) {
    if (match.index > 0) positions.push(match.index);
  }

  positions = positions.filter(function (v, idx, a) { return a.indexOf(v) === idx; });
  positions.sort(function (a, b) { return a - b; });
  return positions;
}

function find_pos_after_words(text, n) {
  var re = /\S+/g;
  var m, count = 0, last_end = 0;
  while ((m = re.exec(text)) !== null) {
    count++;
    last_end = m.index + m[0].length;
    if (count >= n) break;
  }
  return last_end;
}

function fit_words_in_space(text, space) {
  var trimmed = text.replace(/^\s+/, "");
  var leading_space = text.length - trimmed.length;

  if (trimmed.length === 0) return { fitted: "", rest: "" };

  var words = trimmed.split(/(\s+)/);
  var fitted = "";
  var i = 0;

  while (i < words.length) {
    var candidate = fitted + words[i];
    if (candidate.length <= space) {
      fitted = candidate;
      i++;
    } else {
      break;
    }
  }

  if (fitted.length === 0) return { fitted: "", rest: text };

  var rest = words.slice(i).join("");
  return { fitted: fitted, rest: rest };
}

function hard_break_at(text, max) {
  var break_at = max;
  var fitted = text.substring(0, break_at);
  var rest = text.substring(break_at);
  return { fitted: fitted, rest: rest };
}

function count_words_in_text(text) {
  var t = text.trim();
  if (t.length === 0) return 0;
  return t.split(/\s+/).length;
}

function count_total_words(sentences) {
  var total = 0;
  for (var i = 0; i < sentences.length; i++) {
    total += count_words_in_text(sentences[i]);
  }
  return total;
}

function filter_skip_chars(sentences, skip_chars) {
  if (!skip_chars || skip_chars.length === 0) return sentences;
  var char_class = skip_chars.split("").map(function (c) {
    return c.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }).join("");
  var regex = new RegExp("[" + char_class + "]", "g");
  return sentences.map(function (s) {
    return s.replace(regex, "").replace(/\s{2,}/g, " ").trim();
  }).filter(function (s) { return s.length > 0; });
}

/* ─── Seek by word offset ─── */

function seek_to_word_offset(target_offset) {
  var cumulative = 0;
  for (var i = 0; i < reader_state.chunks.length; i++) {
    if (cumulative + reader_state.chunks[i].word_count > target_offset) {
      reader_state.chunk_index = i;
      return;
    }
    cumulative += reader_state.chunks[i].word_count;
  }
  reader_state.chunk_index = reader_state.chunks.length;
}

function get_current_word_offset() {
  var offset = 0;
  for (var i = 0; i < reader_state.chunk_index && i < reader_state.chunks.length; i++) {
    offset += reader_state.chunks[i].word_count;
  }
  return offset;
}

/* ─── Display ─── */

function set_book_title(title) {
  var el = document.querySelector(".reader__book-title");
  if (el) el.textContent = title;
}

function display_current_chunk() {
  var el = document.querySelector(".reader__text-chunk");
  if (!el) return;
  if (reader_state.chunk_index >= reader_state.chunks.length) {
    el.textContent = "— End —";
    stop_playback();
    return;
  }
  el.textContent = reader_state.chunks[reader_state.chunk_index].text;
}

function update_progress() {
  var total = reader_state.total_words;
  var current_offset = get_current_word_offset();
  var percent = total > 0 ? Math.round((current_offset / total) * 100) : 0;
  var fill = document.getElementById("progress-fill");
  if (fill) fill.style.width = percent + "%";
}

/* ─── Timing ─── */

function get_chunk_duration_ms() {
  if (reader_state.chunk_index >= reader_state.chunks.length) return 1000;
  var word_count = reader_state.chunks[reader_state.chunk_index].word_count;
  if (word_count === 0) word_count = 1;
  var base_ms = (word_count / reader_state.wpm) * 60000;
  return base_ms / reader_state.speed;
}

/* ─── Playback ─── */

function start_playback() {
  if (reader_state.chunk_index >= reader_state.chunks.length) return;
  reader_state.playing = true;
  update_play_icon(true);
  start_video();
  schedule_next_chunk();
}

function stop_playback() {
  reader_state.playing = false;
  update_play_icon(false);
  clear_timer();
  stop_tts();
  pause_video();
}

function schedule_next_chunk() {
  clear_timer();
  if (tts_state.fallback_timer) {
    clearTimeout(tts_state.fallback_timer);
    tts_state.fallback_timer = null;
  }
  if (!reader_state.playing) return;

  if (tts_state.enabled) {
    var advanced = false;
    var duration = get_chunk_duration_ms();
    var text = reader_state.chunk_index < reader_state.chunks.length
      ? reader_state.chunks[reader_state.chunk_index].text
      : "";

    function on_speech_done() {
      if (advanced || !reader_state.playing) return;
      advanced = true;
      clearTimeout(tts_state.fallback_timer);
      tts_state.fallback_timer = null;
      advance_chunk(1);
      if (reader_state.playing && reader_state.chunk_index < reader_state.chunks.length) {
        schedule_next_chunk();
      } else {
        stop_playback();
      }
    }

    speak_chunk(text, reader_state.speed, on_speech_done);
    tts_state.fallback_timer = setTimeout(on_speech_done, duration * 2);
  } else {
    var wpm_duration = get_chunk_duration_ms();
    reader_state.timer = setTimeout(function () {
      advance_chunk(1);
      if (reader_state.playing && reader_state.chunk_index < reader_state.chunks.length) {
        schedule_next_chunk();
      } else {
        stop_playback();
      }
    }, wpm_duration);
  }
}

function clear_timer() {
  if (reader_state.timer) {
    clearTimeout(reader_state.timer);
    reader_state.timer = null;
  }
}

function advance_chunk(count) {
  reader_state.chunk_index = Math.min(reader_state.chunk_index + count, reader_state.chunks.length);
  display_current_chunk();
  update_progress();
  save_position();
}

function rewind_chunks(count) {
  reader_state.chunk_index = Math.max(reader_state.chunk_index - count, 0);
  display_current_chunk();
  update_progress();
  save_position();
  if (reader_state.playing) {
    schedule_next_chunk();
  }
}

function get_skip_chunk_count() {
  var seconds = 5;
  if (reader_state.chunks.length === 0) return 1;
  var avg_words = reader_state.total_words / reader_state.chunks.length;
  var chunks_per_second = reader_state.wpm / (avg_words * 60);
  var skip = Math.max(1, Math.round(seconds * chunks_per_second * reader_state.speed));
  return skip;
}

/* ─── Position persistence ─── */

function save_position() {
  if (!reader_state.book) return;
  var word_offset = get_current_word_offset();
  var percent = reader_state.total_words > 0 ? Math.round((word_offset / reader_state.total_words) * 100) : 0;
  update_book_progress(reader_state.book.id, word_offset, percent);
}

/* ─── UI helpers ─── */

function update_play_icon(is_playing) {
  var icon = document.querySelector("#play-pause-btn .reader__nav-icon--center");
  if (icon) {
    icon.src = is_playing ? "images/icons/pause.svg" : "images/icons/play.svg";
    icon.alt = is_playing ? "Pause" : "Play";
  }
}

function apply_reader_layout() {
  var layout = localStorage.getItem("layout") || "immersive";
  var app = document.getElementById("app");
  if (app) app.setAttribute("data-layout", layout);
}

function apply_reader_text_styles() {
  var chunk_el = document.querySelector(".reader__text-chunk");
  if (!chunk_el) return;

  var font = localStorage.getItem("font") || "system-ui";
  var font_size = localStorage.getItem("font_size") || "18";

  chunk_el.style.fontFamily = font;
  chunk_el.style.fontSize = font_size + "px";
}

/* ─── Zen mode (distraction-free) ─── */

function setup_zen_mode() {
  var btn = document.getElementById("fullscreen-btn");
  var app = document.getElementById("app");
  if (!btn || !app) return;

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    app.classList.add("reader--zen");
  });

  app.addEventListener("click", function () {
    if (app.classList.contains("reader--zen")) {
      app.classList.remove("reader--zen");
    }
  });
}

/* ─── Reset progress ─── */

function setup_reset_button() {
  var btn = document.getElementById("reset-btn");
  var modal = document.getElementById("reset-modal");
  var cancel_btn = document.getElementById("reset-cancel");
  var confirm_btn = document.getElementById("reset-confirm");
  if (!btn || !modal) return;

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    modal.classList.remove("hidden");
  });

  cancel_btn.addEventListener("click", function () {
    modal.classList.add("hidden");
  });

  confirm_btn.addEventListener("click", function () {
    modal.classList.add("hidden");
    reset_book_progress();
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

function reset_book_progress() {
  stop_playback();
  reader_state.chunk_index = 0;
  reader_state.word_offset = 0;
  display_current_chunk();
  update_progress();
  if (reader_state.book) {
    update_book_progress(reader_state.book.id, 0, 0);
  }
}

/* ─── Orientation change handling ─── */

function listen_orientation_change() {
  window.addEventListener("resize", debounce_rechunk);
  if (screen.orientation) {
    screen.orientation.addEventListener("change", debounce_rechunk);
  }
}

var _rechunk_timer = null;
function debounce_rechunk() {
  if (_rechunk_timer) clearTimeout(_rechunk_timer);
  _rechunk_timer = setTimeout(function () {
    rechunk_on_resize();
  }, 300);
}

function rechunk_on_resize() {
  if (!reader_state.book) return;
  var old_offset = get_current_word_offset();
  reader_state.word_offset = old_offset;
  compute_max_chars_line();
  build_chunks();
  seek_to_word_offset(old_offset);
  display_current_chunk();
  update_progress();
  if (reader_state.playing) {
    schedule_next_chunk();
  }
}

/* ─── Controls ─── */

function setup_controls() {
  setup_play_pause();
  setup_rewind_forward();
  setup_speed_control();
}

function setup_play_pause() {
  var btn = document.getElementById("play-pause-btn");
  btn.addEventListener("click", function () {
    if (reader_state.playing) {
      stop_playback();
    } else {
      start_playback();
    }
  });
}

function setup_hold_button(btn, on_tap, on_hold_tick) {
  var hold_timeout = null;
  var hold_interval = null;
  var holding = false;

  function start_press(e) {
    e.preventDefault();
    holding = false;
    hold_timeout = setTimeout(function () {
      holding = true;
      on_hold_tick();
      hold_interval = setInterval(on_hold_tick, 500);
    }, 400);
  }

  function end_press() {
    if (hold_timeout) { clearTimeout(hold_timeout); hold_timeout = null; }
    if (hold_interval) { clearInterval(hold_interval); hold_interval = null; }
    if (!holding) on_tap();
    holding = false;
  }

  function cancel_press() {
    if (hold_timeout) { clearTimeout(hold_timeout); hold_timeout = null; }
    if (hold_interval) { clearInterval(hold_interval); hold_interval = null; }
    holding = false;
  }

  btn.addEventListener("mousedown", start_press);
  btn.addEventListener("touchstart", start_press, { passive: false });
  btn.addEventListener("mouseup", end_press);
  btn.addEventListener("touchend", end_press);
  btn.addEventListener("mouseleave", cancel_press);
  btn.addEventListener("touchcancel", cancel_press);
}

function setup_rewind_forward() {
  var rewind_btn = document.getElementById("rewind-btn");
  var forward_btn = document.getElementById("forward-btn");

  setup_hold_button(
    rewind_btn,
    function () { rewind_chunks(get_skip_chunk_count()); },
    function () { rewind_chunks(1); }
  );

  setup_hold_button(
    forward_btn,
    function () {
      advance_chunk(get_skip_chunk_count());
      if (reader_state.playing) schedule_next_chunk();
    },
    function () {
      advance_chunk(1);
      if (reader_state.playing) schedule_next_chunk();
    }
  );
}

function setup_speed_control() {
  var value_el = document.getElementById("speed-value");
  var dec_btn = document.getElementById("speed-dec");
  var inc_btn = document.getElementById("speed-inc");
  var current_index = SPEED_PRESETS.indexOf(reader_state.speed);
  if (current_index === -1) current_index = 2;

  function update_speed_display() {
    value_el.textContent = reader_state.speed + "x";
  }

  dec_btn.addEventListener("click", function () {
    if (current_index > 0) {
      current_index--;
      reader_state.speed = SPEED_PRESETS[current_index];
      update_speed_display();
      if (reader_state.playing) schedule_next_chunk();
    }
  });

  inc_btn.addEventListener("click", function () {
    if (current_index < SPEED_PRESETS.length - 1) {
      current_index++;
      reader_state.speed = SPEED_PRESETS[current_index];
      update_speed_display();
      if (reader_state.playing) schedule_next_chunk();
    }
  });

  update_speed_display();
}

document.addEventListener("DOMContentLoaded", init_reader);
