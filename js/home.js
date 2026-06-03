"use strict";

var TILE_COLORS_HOME = [
  "#3d375799", "#332d4a99", "#4b3a6b99", "#2d284599",
  "#3a2f5599", "#45366099", "#2f264099", "#52407a99"
];

function init_home() {
  setup_add_button();
  load_library();
}

function setup_add_button() {
  var btn = document.getElementById("add-book-btn");
  if (btn) {
    btn.addEventListener("click", trigger_file_picker);
  }
}

function trigger_file_picker() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  input.addEventListener("change", function () {
    if (input.files && input.files.length > 0) {
      handle_pdf_upload(input.files[0]);
    }
  });
  input.click();
}

function handle_pdf_upload(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var buffer = reader.result;
    extract_text_from_pdf(buffer).then(function (result) {
      var title = result.title || strip_pdf_extension(file.name);

      var book = {
        id: generate_id(),
        title: title,
        initials: get_book_initials(title),
        page_count: result.page_count,
        sentences: result.sentences,
        word_offset: 0,
        percent: 0,
        color: TILE_COLORS_HOME[Math.floor(Math.random() * TILE_COLORS_HOME.length)],
        storage_type: "indexeddb",
        added_at: Date.now()
      };

      save_book(book).then(function () {
        render_book_card(book);
      });
    }).catch(function (err) {
      console.error("PDF parse error:", err);
      alert("Failed to parse PDF. Make sure it's a text-based PDF.");
    });
  };
  reader.readAsArrayBuffer(file);
}

function strip_pdf_extension(filename) {
  return filename.replace(/\.pdf$/i, "");
}

function load_library() {
  get_all_books().then(function (books) {
    books.sort(function (a, b) { return b.added_at - a.added_at; });
    var grid = document.getElementById("book-grid");
    grid.innerHTML = "";
    if (books.length === 0) {
      render_empty_state(grid);
      return;
    }
    books.forEach(function (book) {
      render_book_card(book);
    });
  });
}

function render_empty_state(grid) {
  var el = document.createElement("div");
  el.className = "empty-state";
  el.innerHTML = '<p class="empty-state__text">No books yet</p>' +
    '<p class="empty-state__hint">Tap + to upload a PDF</p>';
  grid.appendChild(el);
}

function render_book_card(book) {
  var grid = document.getElementById("book-grid");
  var empty = grid.querySelector(".empty-state");
  if (empty) empty.remove();

  var color = ensure_alpha(book.color || TILE_COLORS_HOME[Math.floor(Math.random() * TILE_COLORS_HOME.length)]);
  var initials = book.initials || get_book_initials(book.title);

  var card = document.createElement("div");
  card.className = "book-card";
  card.setAttribute("data-book-id", book.id);
  card.innerHTML =
    '<div class="book-card__cover" style="background:' + color + '">' +
      '<span class="book-card__initials">' + escape_html(initials) + '</span>' +
      '<a href="book_options.html?id=' + book.id + '" class="book-card__menu-btn">⋯</a>' +
    '</div>' +
    '<div class="book-card__info">' +
      '<p class="book-card__title">' + escape_html(book.title) + '</p>' +
      '<div class="book-card__progress-bar">' +
        '<div class="book-card__progress-fill" style="width:' + book.percent + '%"></div>' +
      '</div>' +
      '<span class="book-card__percent">' + book.percent + '%</span>' +
    '</div>';

  var cover = card.querySelector(".book-card__cover");
  cover.addEventListener("click", function (e) {
    if (e.target.closest(".book-card__menu-btn")) return;
    window.location.href = "reader.html?id=" + book.id;
  });

  grid.appendChild(card);
}

function get_book_initials(title) {
  if (!title) return "?";
  var words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function ensure_alpha(color) {
  if (color && color.length === 7 && color[0] === "#") {
    return color + "99";
  }
  return color;
}

function escape_html(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", init_home);
