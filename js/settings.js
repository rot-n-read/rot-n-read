"use strict";

function init_settings() {
  init_pill_toggles();
  init_layout_picker();
  init_sliders();
  init_steppers();
  init_font_select();
  init_video_selects();
  init_cache_button();
}

function init_pill_toggles() {
  var toggles = document.querySelectorAll(".pill-toggle");
  toggles.forEach(function (toggle) {
    var setting = toggle.getAttribute("data-setting");
    var btns = toggle.querySelectorAll(".pill-toggle__btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("pill-toggle__btn--active"); });
        btn.classList.add("pill-toggle__btn--active");
        var value = btn.getAttribute("data-value");
        if (setting === "theme") {
          apply_theme(value);
        } else if (setting === "orientation") {
          apply_orientation(value);
        }
      });
    });
  });
  load_theme();
  load_orientation();
}

function apply_theme(value) {
  var root = document.documentElement;
  if (value === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (value === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", value);
  update_favicon();
}

function load_theme() {
  var saved = localStorage.getItem("theme");
  if (saved) {
    apply_theme(saved);
    var toggle = document.querySelector('[data-setting="theme"]');
    if (toggle) {
      var btns = toggle.querySelectorAll(".pill-toggle__btn");
      btns.forEach(function (b) {
        b.classList.remove("pill-toggle__btn--active");
        if (b.getAttribute("data-value") === saved) {
          b.classList.add("pill-toggle__btn--active");
        }
      });
    }
  }
}

function apply_orientation(value) {
  localStorage.setItem("orientation", value);
  lock_orientation(value);
  update_layout_icons_rotation();
}

function load_orientation() {
  var saved = localStorage.getItem("orientation") || "auto";
  lock_orientation(saved);
  var toggle = document.querySelector('[data-setting="orientation"]');
  if (toggle) {
    var btns = toggle.querySelectorAll(".pill-toggle__btn");
    btns.forEach(function (b) {
      b.classList.remove("pill-toggle__btn--active");
      if (b.getAttribute("data-value") === saved) {
        b.classList.add("pill-toggle__btn--active");
      }
    });
  }
}

function lock_orientation(value) {
  if (!screen.orientation || !screen.orientation.lock) return;
  if (value === "auto") {
    screen.orientation.unlock();
    return;
  }
  screen.orientation.lock(value).catch(function (err) {
    console.warn("Orientation lock failed:", err.message);
  });
}

function init_layout_picker() {
  var picker = document.querySelector(".layout-picker");
  if (!picker) return;
  var items = picker.querySelectorAll(".layout-picker__item");
  var saved_layout = localStorage.getItem("layout") || "immersive";

  items.forEach(function (item) {
    if (item.getAttribute("data-value") === saved_layout) {
      items.forEach(function (i) { i.classList.remove("layout-picker__item--active"); });
      item.classList.add("layout-picker__item--active");
    }
    item.addEventListener("click", function () {
      items.forEach(function (i) { i.classList.remove("layout-picker__item--active"); });
      item.classList.add("layout-picker__item--active");
      var value = item.getAttribute("data-value");
      localStorage.setItem("layout", value);
      toggle_secondary_video_group(value);
    });
  });

  toggle_secondary_video_group(saved_layout);
  update_layout_icons_rotation();
  window.matchMedia("(orientation: landscape)").addEventListener("change", update_layout_icons_rotation);
}

function update_layout_icons_rotation() {
  var picker = document.querySelector(".layout-picker");
  if (!picker) return;
  var orientation = localStorage.getItem("orientation") || "auto";
  var is_landscape = orientation === "landscape" ||
    (orientation === "auto" && window.matchMedia("(orientation: landscape)").matches);
  picker.classList.toggle("layout-picker--landscape", is_landscape);
}

function init_sliders() {
  setup_slider("overlay-opacity", "overlay-opacity-value", "%", "overlay_opacity");
  setup_slider("font-size", "font-size-value", "px", "font_size");
}

function setup_slider(input_id, display_id, unit, storage_key) {
  var input = document.getElementById(input_id);
  var display = document.getElementById(display_id);
  if (!input || !display) return;

  var saved = localStorage.getItem(storage_key);
  if (saved) {
    input.value = saved;
    display.textContent = saved + unit;
  }

  input.addEventListener("input", function () {
    display.textContent = input.value + unit;
    if (storage_key) localStorage.setItem(storage_key, input.value);
  });
}

function init_steppers() {
  setup_stepper("pace-value", 10, 300, 5);
  setup_stepper("rows-value", 1, 6, 1);
}

function setup_stepper(value_id, min, max, step) {
  var display = document.getElementById(value_id);
  if (!display) return;
  var stepper = display.closest(".stepper");
  var dec_btn = stepper.querySelector(".stepper__btn--dec");
  var inc_btn = stepper.querySelector(".stepper__btn--inc");
  var setting_key = stepper.closest("[data-setting]");
  var key = setting_key ? setting_key.getAttribute("data-setting") : value_id;

  var saved = localStorage.getItem(key);
  if (saved) display.textContent = saved;

  dec_btn.addEventListener("click", function () {
    var current = parseInt(display.textContent);
    if (current - step >= min) {
      display.textContent = current - step;
      localStorage.setItem(key, current - step);
    }
  });

  inc_btn.addEventListener("click", function () {
    var current = parseInt(display.textContent);
    if (current + step <= max) {
      display.textContent = current + step;
      localStorage.setItem(key, current + step);
    }
  });
}

function init_font_select() {
  var font_select = document.getElementById("font-select");
  if (!font_select) return;

  var saved_font = localStorage.getItem("font") || "system-ui";
  font_select.value = saved_font;

  font_select.addEventListener("change", function () {
    localStorage.setItem("font", font_select.value);
  });
}

function init_video_selects() {
  var primary_select = document.getElementById("video-select");
  var secondary_select = document.getElementById("video-secondary-select");

  var saved_primary = localStorage.getItem("video_type") || "mmm_fingers";
  var saved_secondary = localStorage.getItem("video_type_secondary") || "subway_surfers";

  if (primary_select) {
    primary_select.value = saved_primary;
    primary_select.addEventListener("change", function () {
      localStorage.setItem("video_type", primary_select.value);
    });
  }

  if (secondary_select) {
    secondary_select.value = saved_secondary;
    secondary_select.addEventListener("change", function () {
      localStorage.setItem("video_type_secondary", secondary_select.value);
    });
  }
}

function toggle_secondary_video_group(layout) {
  var group = document.getElementById("video-secondary-group");
  if (!group) return;
  if (layout === "ultra") {
    group.classList.remove("hidden");
  } else {
    group.classList.add("hidden");
  }
}

var VIDEO_CACHE_URLS = [
  "./videos/mmm_fingers/1.mp4",
  "./videos/subway_surfers/1.mp4",
  "./videos/subway_surfers/2.mp4",
  "./videos/subway_surfers/3.mp4"
];

function init_cache_button() {
  var btn = document.getElementById("cache-all-btn");
  var status_el = document.getElementById("cache-status");
  if (!btn) return;

  check_cache_status(status_el);

  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Downloading...";
    status_el.textContent = "";
    cache_all_videos().then(function () {
      btn.textContent = "Download All Videos";
      btn.disabled = false;
      status_el.textContent = "All videos cached for offline use";
    }).catch(function (err) {
      btn.textContent = "Download All Videos";
      btn.disabled = false;
      status_el.textContent = "Failed: " + err.message;
    });
  });
}

function cache_all_videos() {
  return caches.open("rot-n-read-videos").then(function (cache) {
    return Promise.all(VIDEO_CACHE_URLS.map(function (url) {
      return cache.add(url);
    }));
  });
}

function check_cache_status(status_el) {
  if (!status_el) return;
  caches.open("rot-n-read-videos").then(function (cache) {
    return Promise.all(VIDEO_CACHE_URLS.map(function (url) {
      return cache.match(url);
    }));
  }).then(function (results) {
    var all_cached = results.every(function (r) { return !!r; });
    if (all_cached) {
      status_el.textContent = "All videos cached for offline use";
    }
  });
}

document.addEventListener("DOMContentLoaded", init_settings);
