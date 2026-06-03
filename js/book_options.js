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
