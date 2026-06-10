"use strict";

var tts_state = {
  enabled: false,
  voice_name: "",
  utterance: null,
  speaking: false,
  fallback_timer: null
};

function is_tts_supported() {
  return "speechSynthesis" in window;
}

function init_tts() {
  tts_state.enabled = localStorage.getItem("tts_enabled") === "true";
  tts_state.voice_name = localStorage.getItem("tts_voice") || "";
}

function get_available_voices() {
  if (!is_tts_supported()) return [];
  return speechSynthesis.getVoices();
}

function set_tts_enabled(bool) {
  tts_state.enabled = bool;
  localStorage.setItem("tts_enabled", bool ? "true" : "false");
}

function set_tts_voice(voice_name) {
  tts_state.voice_name = voice_name;
  localStorage.setItem("tts_voice", voice_name);
}

function speak_chunk(text, rate, on_end_cb) {
  if (!is_tts_supported()) {
    on_end_cb();
    return;
  }
  if (tts_state.utterance) {
    tts_state.utterance.onend = null;
    tts_state.utterance.onerror = null;
  }
  speechSynthesis.cancel();
  tts_state.speaking = false;

  var utterance = new SpeechSynthesisUtterance(text.replace(/\n/g, " "));
  utterance.rate = rate;

  if (tts_state.voice_name) {
    var voices = speechSynthesis.getVoices();
    var matched = voices.find(function (v) { return v.name === tts_state.voice_name; });
    if (matched) utterance.voice = matched;
  }

  utterance.onend = function () {
    tts_state.speaking = false;
    on_end_cb();
  };

  utterance.onerror = function () {
    tts_state.speaking = false;
    on_end_cb();
  };

  tts_state.utterance = utterance;
  tts_state.speaking = true;
  speechSynthesis.speak(utterance);
}

function stop_tts() {
  if (tts_state.fallback_timer) {
    clearTimeout(tts_state.fallback_timer);
    tts_state.fallback_timer = null;
  }
  if (is_tts_supported()) {
    speechSynthesis.cancel();
  }
  tts_state.speaking = false;
  tts_state.utterance = null;
}
