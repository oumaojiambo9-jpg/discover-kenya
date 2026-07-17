/**
 * Runs in <head> before first paint of the body hero.
 * Applies cached hero URLs from localStorage so reloads don't flash blank green heroes.
 * Falls back to local CMS defaults (same as localhost admin) when cache is empty.
 */
(function () {
  var HERO_FALLBACKS = {
    hero_home: '/uploads/0cc17d14-ee85-4ac7-8809-aee5c23a05cd.jpg',
    hero_experiences: '/IMAGES/Elelphant/elephant.png.jpg',
    hero_stories: '/IMAGES/Stories/bonfire%20stories.jpg',
    hero_inquire: '/IMAGES/Inquiring/inquiring.jpg',
    hero_packages: '/IMAGES/Classic%20mara/classic%20mara.jpg',
    hero_destinations: '/uploads/e388c2a9-b60c-4a55-9a72-72c07adcb936.jpg',
    hero_plan: '/uploads/5c6969ed-4846-4387-9a3a-9fd383a3f793.jpg',
    hero_visa: '/uploads/5947f859-fdc1-4763-88c9-c4eee59bdabf.jpg',
    hero_travel_guide: '/uploads/b806e5b2-c8d2-4f5f-beda-82c74312e7d8.jpg',
    hero_accommodation: '/uploads/134c8632-6429-480e-8264-ec6cba987bd2.jpg',
    hero_getting_here: '/uploads/1aaa578a-10bd-46b1-ae6b-206dbbc785cc.jpg',
    hero_weather: '/uploads/df5cbfed-c48e-41f6-88d8-7e80e2964e44.jpg',
    hero_faqs: '/uploads/f0993b90-26e1-494a-94ac-d45ce4bd780c.jpg',
    hero_maasai_mara: '/uploads/0017431f-79fb-44e2-8bda-9cf099f228c8.jpg',
    hero_amboseli: '/uploads/06b80f3b-a788-4c59-8517-8b3ec3e19bc4.jpg',
    hero_nairobi: '/uploads/55949b46-a821-44b5-b1dc-55d7171a985d.jpg',
    hero_diani_beach: '/uploads/dcd0a62c-e1a7-4978-87f8-da4282fb75ac.jpg',
    hero_mount_kenya: '/uploads/06f65f6c-7c32-4d96-b6e7-249367a0004a.jpg',
    hero_lake_nakuru: '/uploads/85a96d0c-3947-4903-b593-89e55d3e411f.jpg',
    hero_lamu: '/uploads/c727e0d3-8046-4aa8-a394-5c8cd051f6e9.jpg'
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
    var map = {};
    Object.keys(HERO_FALLBACKS).forEach(function (k) { map[k] = HERO_FALLBACKS[k]; });
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
