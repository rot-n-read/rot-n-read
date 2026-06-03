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
  wpm: 30,
  speed: 1,
  max_chars_line: 50,
  rows: 3,
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
    reader_state.wpm = parseInt(localStorage.getItem("pace") || "30", 10);
    reader_state.rows = parseInt(localStorage.getItem("rows") || "3", 10);
    reader_state.font = localStorage.getItem("font") || "system-ui";
    reader_state.font_size = parseInt(localStorage.getItem("font_size") || "18", 10);
    reader_state.total_words = count_total_words(reader_state.sentences);
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
  var lines = [];
  var current_line = "";
  var sentence_idx = start_sentence;
  var char_offset = start_char_offset;
  var word_count = 0;
  var last_sentence_start_line = -1;
  var last_sentence_word_count_in_chunk = 0;
  var last_sentence_total_words = 0;
  var last_sentence_idx = start_sentence;
  var last_sentence_char_offset = start_char_offset;

  while (sentence_idx < sentences.length && lines.length < max_rows) {
    var sentence = sentences[sentence_idx];
    var remaining = sentence.substring(char_offset);

    if (remaining.length === 0) {
      sentence_idx++;
      char_offset = 0;
      continue;
    }

    var is_new_sentence = (char_offset === 0 && (sentence_idx !== start_sentence || start_char_offset === 0));
    if (is_new_sentence && lines.length > 0) {
      last_sentence_start_line = lines.length;
      if (current_line.length > 0) {
        last_sentence_start_line = lines.length;
      }
      last_sentence_word_count_in_chunk = 0;
      last_sentence_total_words = count_words_in_text(sentence);
      last_sentence_idx = sentence_idx;
      last_sentence_char_offset = 0;
    }

    while (remaining.length > 0 && lines.length < max_rows) {
      var space_left = max_chars - current_line.length;

      if (space_left <= 0) {
        lines.push(current_line);
        current_line = "";
        space_left = max_chars;
        if (lines.length >= max_rows) break;
      }

      var fit_result = fit_words_in_space(remaining, space_left);

      if (fit_result.fitted.length === 0) {
        if (current_line.length > 0) {
          lines.push(current_line);
          current_line = "";
          if (lines.length >= max_rows) break;
        } else {
          var hard_break = hard_break_at(remaining, max_chars);
          current_line = hard_break.fitted;
          remaining = hard_break.rest;
          char_offset = sentence.length - remaining.length;
          word_count += count_words_in_text(hard_break.fitted);
          if (is_new_sentence || last_sentence_start_line >= 0) {
            last_sentence_word_count_in_chunk += count_words_in_text(hard_break.fitted);
          }
          lines.push(current_line);
          current_line = "";
          if (lines.length >= max_rows) break;
          continue;
        }
      } else {
        if (current_line.length > 0) {
          current_line += fit_result.fitted;
        } else {
          current_line = fit_result.fitted;
        }
        remaining = fit_result.rest;
        char_offset = sentence.length - remaining.length;
        var fitted_words = count_words_in_text(fit_result.fitted);
        word_count += fitted_words;
        if (is_new_sentence || last_sentence_start_line >= 0) {
          last_sentence_word_count_in_chunk += fitted_words;
        }
      }
    }

    if (lines.length >= max_rows) break;

    if (remaining.length === 0) {
      sentence_idx++;
      char_offset = 0;
      if (current_line.length > 0 && current_line.length < max_chars) {
        current_line += " ";
      }
    }
  }

  if (current_line.trim().length > 0 && lines.length < max_rows) {
    lines.push(current_line);
  } else if (current_line.trim().length > 0 && lines.length >= max_rows) {
    // overflow — don't advance past what we showed
  }

  // Apply 30% rule: if a new sentence started on the last line and less than 30% shown, push it back
  if (last_sentence_start_line >= 0 && last_sentence_start_line === lines.length - 1 && last_sentence_total_words > 0) {
    var pct_shown = last_sentence_word_count_in_chunk / last_sentence_total_words;
    if (pct_shown < 0.3) {
      lines = lines.slice(0, last_sentence_start_line);
      word_count -= last_sentence_word_count_in_chunk;
      sentence_idx = last_sentence_idx;
      char_offset = last_sentence_char_offset;
    }
  }

  return {
    lines: lines,
    text: lines.join("\n"),
    word_count: word_count,
    next_sentence_idx: sentence_idx,
    next_char_offset: char_offset
  };
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
  pause_video();
}

function schedule_next_chunk() {
  clear_timer();
  if (!reader_state.playing) return;
  var duration = get_chunk_duration_ms();
  reader_state.timer = setTimeout(function () {
    advance_chunk(1);
    if (reader_state.playing && reader_state.chunk_index < reader_state.chunks.length) {
      schedule_next_chunk();
    } else {
      stop_playback();
    }
  }, duration);
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

function setup_rewind_forward() {
  var rewind_btn = document.getElementById("rewind-btn");
  var forward_btn = document.getElementById("forward-btn");

  rewind_btn.addEventListener("click", function () {
    var skip = get_skip_chunk_count();
    rewind_chunks(skip);
  });

  forward_btn.addEventListener("click", function () {
    var skip = get_skip_chunk_count();
    advance_chunk(skip);
    if (reader_state.playing) {
      schedule_next_chunk();
    }
  });
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
