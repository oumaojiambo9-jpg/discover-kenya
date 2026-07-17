/**
 * Runs in <head> before first paint of the body hero.
 * Applies cached hero URLs from localStorage so reloads don't flash blank green heroes.
 * Falls back to known defaults when cache is empty (first visit / API down).
 */
(function () {
  var HERO_FALLBACKS = {
    hero_home: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=85',
    hero_experiences: '/IMAGES/Elelphant/elephant.png.jpg',
    hero_stories: '/IMAGES/Stories/bonfire%20stories.jpg',
    hero_inquire: '/IMAGES/Inquiring/inquiring.jpg',
    hero_packages: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    hero_destinations: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    hero_plan: 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_visa: 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_travel_guide: 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_accommodation: 'https://images.pexels.com/photos/1402688/pexels-photo-1402688.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_getting_here: 'https://images.pexels.com/photos/4108195/pexels-photo-4108195.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_weather: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1600&q=80',
    hero_faqs: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80',
    hero_maasai_mara: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    hero_amboseli: 'https://images.pexels.com/photos/2888307/pexels-photo-2888307.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_nairobi: 'https://images.pexels.com/photos/931007/pexels-photo-931007.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_diani_beach: 'https://images.pexels.com/photos/2053950/pexels-photo-2053950.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_mount_kenya: 'https://images.pexels.com/photos/3807792/pexels-photo-3807792.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_lake_nakuru: 'https://images.pexels.com/photos/3326647/pexels-photo-3326647.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    hero_lamu: 'https://images.pexels.com/photos/1148997/pexels-photo-1148997.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'
  };

  function inject(map) {
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
  }

  try {
    var map = Object.assign({}, HERO_FALLBACKS);
    var raw = localStorage.getItem('dk_site_images');
    if (raw) {
      var cached = JSON.parse(raw);
      if (cached && typeof cached === 'object') {
        Object.keys(cached).forEach(function (k) {
          if (cached[k]) map[k] = cached[k];
        });
      }
    }
    inject(map);
  } catch (e) {
    inject(HERO_FALLBACKS);
  }
})();
