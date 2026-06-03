"use strict";

var DB_NAME = "rot_n_read";
var DB_VERSION = 1;
var STORE_BOOKS = "books";

function open_db() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (event) {
      var db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: "id" });
      }
    };
    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

function generate_id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function save_book(book) {
  return open_db().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_BOOKS, "readwrite");
      var store = tx.objectStore(STORE_BOOKS);
      store.put(book);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function get_all_books() {
  return open_db().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_BOOKS, "readonly");
      var store = tx.objectStore(STORE_BOOKS);
      var request = store.getAll();
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function get_book(id) {
  return open_db().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_BOOKS, "readonly");
      var store = tx.objectStore(STORE_BOOKS);
      var request = store.get(id);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function delete_book(id) {
  return open_db().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_BOOKS, "readwrite");
      var store = tx.objectStore(STORE_BOOKS);
      store.delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function update_book_progress(id, word_offset, percent) {
  return get_book(id).then(function (book) {
    if (!book) return;
    book.word_offset = word_offset;
    book.percent = percent;
    return save_book(book);
  });
}
