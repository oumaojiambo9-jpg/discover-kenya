/**
 * Runs in <head> before first paint of the body hero.
 * Applies cached hero URLs from localStorage so reloads don't flash the CSS/HTML fallback.
 */
(function () {
  try {
    var raw = localStorage.getItem('dk_site_images');
    if (!raw) return;
    var map = JSON.parse(raw);
    if (!map || typeof map !== 'object') return;

    var css = '';
    Object.keys(map).forEach(function (key) {
      if (key.indexOf('hero_') !== 0) return;
      var url = map[key];
      if (!url) return;
      var safe = String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      css += '[data-hero-key="' + key + '"]{background-image:url("' + safe + '")!important;' +
        'background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;}';
    });
    if (!css) return;

    var style = document.createElement('style');
    style.id = 'hero-early-cache';
    style.textContent = css;
    document.head.appendChild(style);
  } catch (e) { /* ignore */ }
})();
