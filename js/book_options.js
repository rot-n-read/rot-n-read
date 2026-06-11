"use strict";

var TILE_COLORS = [
  "#3d375799", "#332d4a99", "#4b3a6b99", "#2d284599",
  "#3a2f5599", "#45366099", "#2f264099", "#52407a99"
];

var book_options_state = {
  book: null,
  selected_color: ""
};

function init_book_options() {
  var book_id = get_option_book_id();
  if (!book_id) {
    window.location.href = "home.html";
    return;
  }
  load_book_for_options(book_id);
}

function get_option_book_id() {
  var params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function load_book_for_options(book_id) {
  get_book(book_id).then(function (book) {
    if (!book) {
      window.location.href = "home.html";
      return;
    }
    book_options_state.book = book;
    book_options_state.selected_color = book.color || get_random_color();
    populate_fields(book);
    setup_color_picker();
    setup_progress_slider();
    setup_save();
    setup_delete();
  });
}

function populate_fields(book) {
  var title_input = document.getElementById("book-title-input");
  var initials_input = document.getElementById("book-initials-input");
  var skip_chars_input = document.getElementById("skip-chars-input");
  title_input.value = book.title;
  initials_input.value = book.initials || get_initials(book.title);
  skip_chars_input.value = book.skip_chars || "";

  update_preview_tile(initials_input.value, book_options_state.selected_color);

  var storage_badge = document.getElementById("storage-badge");
  storage_badge.textContent = book.storage_type === "filesystem" ? "File System" : "IndexedDB";

  show_storage_size(book);

  title_input.addEventListener("input", function () {
    if (!initials_input.dataset.manual) {
      initials_input.value = get_initials(title_input.value);
      update_preview_tile(initials_input.value, book_options_state.selected_color);
    }
  });

  initials_input.addEventListener("input", function () {
    initials_input.dataset.manual = "1";
    update_preview_tile(initials_input.value, book_options_state.selected_color);
  });
}

function show_storage_size(book) {
  var size_el = document.getElementById("storage-size");
  var bytes = new Blob([JSON.stringify(book)]).size;
  var label;
  if (bytes < 1024) {
    label = bytes + " B";
  } else if (bytes < 1048576) {
    label = (bytes / 1024).toFixed(1) + " KB";
  } else {
    label = (bytes / 1048576).toFixed(1) + " MB";
  }
  size_el.textContent = "(" + label + ")";
}

function update_preview_tile(initials, color) {
  var tile = document.getElementById("preview-tile");
  var initials_el = document.getElementById("preview-initials");
  tile.style.background = color;
  initials_el.textContent = initials || "?";
}

function get_initials(title) {
  if (!title) return "?";
  var words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function get_random_color() {
  return TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
}

function setup_color_picker() {
  var picker = document.getElementById("color-picker");
  var buttons = picker.querySelectorAll(".book-options__color-btn");

  buttons.forEach(function (btn) {
    var color = btn.getAttribute("data-color");
    if (color === book_options_state.selected_color) {
      btn.classList.add("book-options__color-btn--active");
    }
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) { b.classList.remove("book-options__color-btn--active"); });
      btn.classList.add("book-options__color-btn--active");
      book_options_state.selected_color = color;
      update_preview_tile(
        document.getElementById("book-initials-input").value,
        color
      );
    });
  });
}

function setup_save() {
  document.getElementById("save-btn").addEventListener("click", function () {
    var book = book_options_state.book;
    book.title = document.getElementById("book-title-input").value.trim() || book.title;
    book.initials = document.getElementById("book-initials-input").value.trim().toUpperCase().slice(0, 4) || get_initials(book.title);
    book.color = book_options_state.selected_color;
    book.skip_chars = document.getElementById("skip-chars-input").value;
    save_book(book).then(function () {
      window.location.href = "home.html";
    });
  });
}

function count_words_in_text(text) {
  var t = text.trim();
  return t.length === 0 ? 0 : t.split(/\s+/).length;
}

function get_total_words_from_sentences(sentences) {
  var total = 0;
  for (var i = 0; i < sentences.length; i++) {
    total += count_words_in_text(sentences[i]);
  }
  return total;
}

function get_text_at_word_offset(sentences, target_offset) {
  var cumulative = 0;
  for (var i = 0; i < sentences.length; i++) {
    var wc = count_words_in_text(sentences[i]);
    if (cumulative + wc > target_offset || i === sentences.length - 1) {
      return sentences[i].trim();
    }
    cumulative += wc;
  }
  return "";
}

function setup_progress_slider() {
  var book = book_options_state.book;
  var sentences = book.sentences || [];
  if (sentences.length === 0) {
    var group = document.getElementById("progress-group");
    if (group) group.style.display = "none";
    return;
  }

  var total_words = get_total_words_from_sentences(sentences);
  var current_offset = book.word_offset || 0;
  var current_percent = total_words > 0 ? Math.round((current_offset / total_words) * 100) : 0;

  var slider = document.getElementById("progress-slider");
  var preview = document.getElementById("progress-preview");
  var label_from = document.getElementById("progress-label-from");
  var label_total = document.getElementById("progress-label-total");
  var modal = document.getElementById("progress-modal");
  var modal_text = document.getElementById("progress-modal-text");
  var modal_cancel = document.getElementById("progress-modal-cancel");
  var modal_confirm = document.getElementById("progress-modal-confirm");

  slider.value = current_percent;
  label_from.textContent = current_percent + "%";
  label_total.textContent = total_words.toLocaleString() + " words";

  var pending_percent = current_percent;

  function update_preview(percent) {
    var target_offset = Math.floor((percent / 100) * total_words);
    var text = get_text_at_word_offset(sentences, target_offset);
    var truncated = text.length > 160 ? text.slice(0, 160) + "…" : text;
    preview.textContent = truncated || "—";
  }

  update_preview(current_percent);

  slider.addEventListener("input", function () {
    var new_percent = parseInt(slider.value, 10);
    label_from.textContent = new_percent + "%";
    update_preview(new_percent);
    pending_percent = new_percent;
  });

  slider.addEventListener("change", function () {
    if (pending_percent === current_percent) return;
    modal_text.textContent = "Change progress from " + current_percent + "% to " + pending_percent + "?";
    modal.classList.remove("hidden");
  });

  modal_cancel.addEventListener("click", function () {
    modal.classList.add("hidden");
    slider.value = current_percent;
    label_from.textContent = current_percent + "%";
    update_preview(current_percent);
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.classList.add("hidden");
      slider.value = current_percent;
      label_from.textContent = current_percent + "%";
      update_preview(current_percent);
    }
  });

  modal_confirm.addEventListener("click", function () {
    var new_word_offset = Math.floor((pending_percent / 100) * total_words);
    book_options_state.book.word_offset = new_word_offset;
    book_options_state.book.percent = pending_percent;
    current_percent = pending_percent;
    update_book_progress(book_options_state.book.id, new_word_offset, pending_percent);
    modal.classList.add("hidden");
    label_from.textContent = current_percent + "%";
  });
}

function setup_delete() {
  var delete_btn = document.getElementById("delete-btn");
  var modal = document.getElementById("delete-modal");
  var cancel_btn = document.getElementById("modal-cancel");
  var confirm_btn = document.getElementById("modal-confirm");

  delete_btn.addEventListener("click", function () {
    modal.classList.remove("hidden");
  });

  cancel_btn.addEventListener("click", function () {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.classList.add("hidden");
  });

  confirm_btn.addEventListener("click", function () {
    delete_book(book_options_state.book.id).then(function () {
      window.location.href = "home.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", init_book_options);
