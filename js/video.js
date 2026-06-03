"use strict";

var VIDEO_TYPES = [
  { id: "mmm_fingers", label: "Mmm Fingers" },
  { id: "subway_surfers", label: "Subway Surfers" }
];

var CLIPS_PER_TYPE = 1;

var video_state = {
  primary_type: "",
  secondary_type: "",
  primary_index: 0,
  secondary_index: 0,
  primary_el: null,
  secondary_el: null,
  overlay_el: null,
  layout: "immersive",
  active: false
};

function init_video_player() {
  video_state.primary_el = document.querySelector(".reader__video--primary");
  video_state.secondary_el = document.querySelector(".reader__video--secondary");
  video_state.overlay_el = document.querySelector(".reader__overlay");
  video_state.layout = get_reader_layout();
  load_video_settings();
  apply_overlay_opacity();
  bind_video_events();
  preload_videos();
}

function get_reader_layout() {
  var app = document.getElementById("app");
  return app ? app.getAttribute("data-layout") || "immersive" : "immersive";
}

function load_video_settings() {
  video_state.primary_type = localStorage.getItem("video_type") || "mmm_fingers";
  video_state.secondary_type = localStorage.getItem("video_type_secondary") || "subway_surfers";
}

function apply_overlay_opacity() {
  if (!video_state.overlay_el) return;
  var opacity = parseInt(localStorage.getItem("overlay_opacity") || "40", 10);
  video_state.overlay_el.style.opacity = (opacity / 100).toString();
}

function bind_video_events() {
  if (video_state.primary_el) {
    video_state.primary_el.addEventListener("ended", function () {
      advance_clip("primary");
    });
  }
  if (video_state.secondary_el) {
    video_state.secondary_el.addEventListener("ended", function () {
      advance_clip("secondary");
    });
  }
}

function preload_videos() {
  video_state.primary_index = random_clip_index();
  set_clip_src("primary");

  if (video_state.layout === "ultra") {
    video_state.secondary_index = random_clip_index();
    set_clip_src("secondary");
  }
}

function set_clip_src(which) {
  var el = which === "primary" ? video_state.primary_el : video_state.secondary_el;
  var type = which === "primary" ? video_state.primary_type : video_state.secondary_type;
  var index = which === "primary" ? video_state.primary_index : video_state.secondary_index;
  if (!el) return;

  var count = get_clip_count(type);
  var clip_num = (index % count) + 1;
  el.src = "videos/" + type + "/" + clip_num + ".mp4";
  el.preload = "auto";
  el.loop = count === 1;
  el.load();
}

function start_video() {
  video_state.active = true;
  play_video_element(video_state.primary_el);

  if (video_state.layout === "ultra") {
    play_video_element(video_state.secondary_el);
  }
}

function stop_video() {
  video_state.active = false;
  pause_video_element(video_state.primary_el);
  pause_video_element(video_state.secondary_el);
}

function pause_video() {
  pause_video_element(video_state.primary_el);
  pause_video_element(video_state.secondary_el);
}

function resume_video() {
  if (!video_state.active) return;
  play_video_element(video_state.primary_el);
  if (video_state.layout === "ultra") {
    play_video_element(video_state.secondary_el);
  }
}

var CLIP_COUNTS = {
  mmm_fingers: 1,
  subway_surfers: 3
};

function get_clip_count(type) {
  return CLIP_COUNTS[type] || CLIPS_PER_TYPE;
}

function load_and_play_clip(which) {
  var el = which === "primary" ? video_state.primary_el : video_state.secondary_el;
  var type = which === "primary" ? video_state.primary_type : video_state.secondary_type;
  var index = which === "primary" ? video_state.primary_index : video_state.secondary_index;
  if (!el) return;

  var count = get_clip_count(type);
  var clip_num = (index % count) + 1;
  var src = "videos/" + type + "/" + clip_num + ".mp4";

  if (count === 1) {
    el.loop = true;
  } else {
    el.loop = false;
  }

  el.src = src;
  el.load();
  play_video_element(el);
}

function advance_clip(which) {
  if (!video_state.active) return;
  if (which === "primary") {
    video_state.primary_index = next_clip_index(video_state.primary_index);
    load_and_play_clip("primary");
  } else {
    video_state.secondary_index = next_clip_index(video_state.secondary_index);
    load_and_play_clip("secondary");
  }
}

function next_clip_index(current) {
  return (current + 1) % CLIPS_PER_TYPE;
}

function random_clip_index() {
  return Math.floor(Math.random() * CLIPS_PER_TYPE);
}

function play_video_element(el) {
  if (!el || !el.src) return;
  var promise = el.play();
  if (promise) {
    promise.catch(function (err) {
      console.warn("Video play failed:", err.message);
    });
  }
}

function pause_video_element(el) {
  if (!el) return;
  try { el.pause(); } catch (e) { /* ignore */ }
}

function get_video_type_label(type_id) {
  for (var i = 0; i < VIDEO_TYPES.length; i++) {
    if (VIDEO_TYPES[i].id === type_id) return VIDEO_TYPES[i].label;
  }
  return type_id;
}
