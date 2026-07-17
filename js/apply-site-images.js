/**
 * Applies CMS site images from GET /api/site-images:
 *  - <img data-img-key="..."> → sets src
 *  - [data-hero-key="..."]    → sets background-image (page heroes)
 * Also refreshes localStorage cache used by hero-early.js to avoid FOUC on reload.
 */
(function () {
  var CACHE_KEY = 'dk_site_images';

  function applyMap(imgs) {
    if (!imgs || typeof imgs !== 'object') return;

    document.querySelectorAll('img[data-img-key]').forEach(function (img) {
      var url = imgs[img.getAttribute('data-img-key')];
      if (url) img.src = url;
    });

    document.querySelectorAll('[data-hero-key]').forEach(function (el) {
      var url = imgs[el.getAttribute('data-hero-key')];
      if (url) {
        el.style.setProperty('background-image', "url('" + String(url).replace(/'/g, "\\'") + "')");
        el.style.setProperty('background-size', 'cover');
        el.style.setProperty('background-position', 'center');
        el.style.setProperty('background-repeat', 'no-repeat');
      }
    });
  }

  function saveCache(imgs) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(imgs));
    } catch (e) { /* quota / private mode */ }
  }

  // Instant apply from cache if DOM already has heroes (body scripts)
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) applyMap(JSON.parse(cached));
  } catch (e) { /* ignore */ }

  (async function () {
    try {
      var res = await fetch('/api/site-images');
      if (!res.ok) return;
      var imgs = await res.json();
      applyMap(imgs);
      saveCache(imgs);
    } catch (e) {
      /* keep static / cached fallbacks */
    }
  })();
})();
