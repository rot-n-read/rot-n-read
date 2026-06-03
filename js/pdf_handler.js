"use strict";

var pdfjsLib = null;

function load_pdfjs() {
  if (pdfjsLib) return Promise.resolve(pdfjsLib);
  return import("../lib/pdfjs/pdf.min.js").then(function (module) {
    pdfjsLib = module;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdfjs/pdf.worker.min.js";
    return pdfjsLib;
  });
}

function extract_text_from_pdf(file_or_buffer) {
  return load_pdfjs().then(function (lib) {
    var source;
    if (file_or_buffer instanceof ArrayBuffer) {
      source = { data: new Uint8Array(file_or_buffer) };
    } else {
      source = { data: new Uint8Array(file_or_buffer) };
    }
    return lib.getDocument(source).promise;
  }).then(function (pdf) {
    return extract_all_pages(pdf);
  });
}

function extract_all_pages(pdf) {
  var total_pages = pdf.numPages;
  var pages_text = [];
  var metadata_promise = pdf.getMetadata().then(function (meta) {
    return meta.info && meta.info.Title ? meta.info.Title : "";
  }).catch(function () { return ""; });

  var chain = Promise.resolve();
  for (var i = 1; i <= total_pages; i++) {
    (function (page_num) {
      chain = chain.then(function () {
        return pdf.getPage(page_num).then(function (page) {
          var viewport = page.getViewport({ scale: 1 });
          var page_height = viewport.height;
          return page.getTextContent().then(function (content) {
            return { content: content, page_height: page_height };
          });
        }).then(function (result) {
          var items = result.content.items;
          var page_height = result.page_height;
          var margin = page_height * 0.08;
          var body_items = items.filter(function (item) {
            var y = item.transform[5];
            return y > margin && y < (page_height - margin);
          });
          var page_text = body_items.map(function (item) {
            return item.str;
          }).join(" ");
          pages_text.push(page_text);
        });
      });
    })(i);
  }

  return chain.then(function () {
    return metadata_promise;
  }).then(function (title) {
    var full_text = pages_text.join(" ");
    return {
      title: title,
      full_text: full_text,
      sentences: split_into_sentences(full_text),
      page_count: total_pages
    };
  });
}

function split_into_sentences(text) {
  var ABBREVIATIONS = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Gen|Gov|Sgt|Cpl|Pvt|Lt|Col|Maj|Capt|Rev|Vol|Inc|Corp|Ltd|Dept|Univ|Est|Approx|etc|vs|al|fig|eq|no|op|ed|trans|pub)\./gi;
  var placeholder = "\u0000ABBR\u0000";

  var safe_text = text.replace(ABBREVIATIONS, function (match) {
    return match.slice(0, -1) + placeholder;
  });

  safe_text = safe_text.replace(/(\d)\./g, "$1" + placeholder);
  safe_text = safe_text.replace(/\.{2,}/g, function (m) {
    return m.replace(/\./g, placeholder);
  });

  var raw = safe_text.split(/(?<=[.!?])\s+/);

  var sentences = raw.map(function (s) {
    return s.replace(new RegExp(placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), "g"), ".").trim();
  }).filter(function (s) { return s.length > 0; });

  return sentences;
}
