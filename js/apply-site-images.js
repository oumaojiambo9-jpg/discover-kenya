/**
 * Applies CMS site images from GET /api/site-images:
 *  - <img data-img-key="..."> → sets src
 *  - [data-hero-key="..."]    → sets background-image (page heroes)
 * Also refreshes localStorage cache used by hero-early.js to avoid FOUC on reload.
 *
 * Built-in FALLBACKS ensure heroes/cards still show when the API is down.
 */
(function () {
  var CACHE_KEY = 'dk_site_images';

  // Defaults mirror api/index.js SITE_IMAGE_KEYS — used when API fails or returns null.
  var FALLBACKS = {
    'home_pkg_mt-kenya-ol-pejeta-5day': '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg',
    'home_pkg_laikipia-conservancy-4day': '/IMAGES/Lion/lion.png.jpg',
    'home_pkg_solio-ol-pejeta-4day': '/IMAGES/Elelphant/elephant.png.jpg',
    'home_pkg_mt-kenya-lenana-5day': '/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg',
    'home_pkg_northern-kenya-meru-7day': '/IMAGES/Maasai/huts.png.jpg',
    'home_pkg_luxury-conservancy-custom': '/IMAGES/Luxury/luxury.png.jpg',
    'story_migration': '/IMAGES/Migration/migration.jpg',
    'story_swahili_coast': '/IMAGES/Swahili/swahili.jpg',
    'story_conservation': '/IMAGES/Conservation/conservation.jpg',
    'story_safari_lodges': '/IMAGES/Safari%20lodges/safari%20lodge.jpg',
    'story_photography': '/IMAGES/Photography/photography.jpg',
    'story_cuisine': '/IMAGES/Kenyan%20cuisine/kenyan%20cuisine.jpg',
    'exp_big_five': '/IMAGES/Lion/lion.png.jpg',
    'exp_coastal_paradise': 'https://images.pexels.com/photos/2053950/pexels-photo-2053950.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
    'exp_cultural_immersion': '/IMAGES/Maasai/huts.png.jpg',
    'exp_mount_kenya': '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg',
    'exp_rift_valley': '/IMAGES/Rift/rift%20valley.png.jpg',
    'exp_balloon_safari': '/IMAGES/Hot%20air/hot%20air%20balloon.png.jpg',
    'hero_home': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=85',
    'hero_experiences': '/IMAGES/Elelphant/elephant.png.jpg',
    'hero_stories': '/IMAGES/Stories/bonfire%20stories.jpg',
    'hero_inquire': '/IMAGES/Inquiring/inquiring.jpg',
    'hero_packages': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    'hero_destinations': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    'hero_plan': 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_visa': 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_travel_guide': 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_accommodation': 'https://images.pexels.com/photos/1402688/pexels-photo-1402688.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_getting_here': 'https://images.pexels.com/photos/4108195/pexels-photo-4108195.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_weather': 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1600&q=80',
    'hero_faqs': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80',
    'hero_maasai_mara': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    'hero_amboseli': 'https://images.pexels.com/photos/2888307/pexels-photo-2888307.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_nairobi': 'https://images.pexels.com/photos/931007/pexels-photo-931007.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_diani_beach': 'https://images.pexels.com/photos/2053950/pexels-photo-2053950.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_mount_kenya': 'https://images.pexels.com/photos/3807792/pexels-photo-3807792.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_lake_nakuru': 'https://images.pexels.com/photos/3326647/pexels-photo-3326647.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80',
    'hero_lamu': 'https://images.pexels.com/photos/1148997/pexels-photo-1148997.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'
  };

  function mergeWithFallbacks(imgs) {
    var out = {};
    Object.keys(FALLBACKS).forEach(function (k) {
      out[k] = FALLBACKS[k];
    });
    if (imgs && typeof imgs === 'object') {
      Object.keys(imgs).forEach(function (k) {
        if (imgs[k]) out[k] = imgs[k];
      });
    }
    return out;
  }

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

  // Instant apply: cache first, then static fallbacks (so first visit isn't blank)
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) applyMap(mergeWithFallbacks(JSON.parse(cached)));
    else applyMap(FALLBACKS);
  } catch (e) {
    applyMap(FALLBACKS);
  }

  (async function () {
    try {
      var res = await fetch('/api/site-images');
      if (!res.ok) {
        applyMap(FALLBACKS);
        return;
      }
      var imgs = await res.json();
      var merged = mergeWithFallbacks(imgs);
      applyMap(merged);
      saveCache(merged);
    } catch (e) {
      applyMap(FALLBACKS);
    }
  })();
})();
