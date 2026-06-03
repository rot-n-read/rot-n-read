"use strict";

function init() {
  register_service_worker();
  apply_saved_theme();
  apply_saved_orientation();
}

function register_service_worker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      console.warn("SW registration failed:", err);
    });
  }
}

function unregister_service_workers() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (reg) { reg.unregister(); });
    });
    caches.keys().then(function (keys) {
      keys.forEach(function (key) { caches.delete(key); });
    });
  }
}

function apply_saved_theme() {
  var saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
  update_favicon();
}

function update_favicon() {
  var is_light = document.documentElement.getAttribute("data-theme") === "light" ||
    (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: light)").matches);
  var favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    favicon.href = is_light ? "images/logo/logo.svg" : "images/alt-logo/logo.alt.svg";
  }
}

function apply_saved_orientation() {
  var saved = localStorage.getItem("orientation") || "auto";
  if (!screen.orientation || !screen.orientation.lock) return;
  if (saved === "auto") {
    screen.orientation.unlock();
    return;
  }
  screen.orientation.lock(saved).catch(function (err) {
    console.warn("Orientation lock failed:", err.message);
    document.addEventListener("click", function retry_lock() {
      screen.orientation.lock(saved).catch(function () {});
      document.removeEventListener("click", retry_lock);
    }, { once: true });
  });
}

document.addEventListener("DOMContentLoaded", init);
