/**
 * Applies CMS site images from GET /api/site-images:
 *  - <img data-img-key="..."> → sets src
 *  - [data-hero-key="..."]    → sets background-image (page heroes)
 * Also refreshes localStorage cache used by hero-early.js to avoid FOUC on reload.
 *
 * Built-in FALLBACKS mirror local admin CMS so live matches localhost even if API is down.
 */
(function () {
  var CACHE_KEY = 'dk_site_images';

  var FALLBACKS = {
    'home_pkg_mt-kenya-ol-pejeta-5day': '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg',
    'home_pkg_laikipia-conservancy-4day': '/uploads/6895a494-4851-4b8c-ad0e-0e5f458b290d.jpg',
    'home_pkg_solio-ol-pejeta-4day': '/uploads/48518b61-7c55-4807-b349-1dd9bda2146a.jpg',
    'home_pkg_mt-kenya-lenana-5day': '/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg',
    'home_pkg_northern-kenya-meru-7day': '/IMAGES/Maasai/huts.png.jpg',
    'home_pkg_luxury-conservancy-custom': '/uploads/18e799d4-bd29-44cf-a5ea-054a6d34f401.jpg',
    'story_migration': '/uploads/28c06eec-3a1d-4d74-8435-b6497532f590.jpg',
    'story_swahili_coast': '/uploads/e3037827-d217-4d41-90fe-f3d05f3c77ed.jpg',
    'story_conservation': '/uploads/ae911d00-4144-4372-8e7d-d935a8f78a71.jpg',
    'story_safari_lodges': '/uploads/715767cc-5cf1-4079-8039-5a4fbcd3ccf0.jpg',
    'story_photography': '/uploads/dff7d9b7-8893-455a-8895-a5206533339a.jpg',
    'story_cuisine': '/uploads/df9e0a0d-bc5a-426e-9f1d-086ecd7d61fa.jpg',
    'exp_big_five': '/uploads/77daf644-e997-4f13-96ed-f8448a77d2a6.jpg',
    'exp_coastal_paradise': '/uploads/c6813b13-9419-4832-adc2-d316d74477ae.jpg',
    'exp_cultural_immersion': '/uploads/b54110fd-be9e-4adc-9d39-4fa671398963.jpg',
    'exp_mount_kenya': '/uploads/3af6a218-5524-4344-98bb-102a3c1a4a8a.jpg',
    'exp_rift_valley': '/uploads/7a2b9603-ea48-4e4b-b7fc-21c2af8c8b25.jpg',
    'exp_balloon_safari': '/uploads/ffc16e42-71da-4b38-97b0-ee02072b13af.jpg',
    'hero_home': '/uploads/0cc17d14-ee85-4ac7-8809-aee5c23a05cd.jpg',
    'hero_experiences': '/IMAGES/Elelphant/elephant.png.jpg',
    'hero_stories': '/IMAGES/Stories/bonfire%20stories.jpg',
    'hero_inquire': '/IMAGES/Inquiring/inquiring.jpg',
    'hero_packages': '/IMAGES/Classic%20mara/classic%20mara.jpg',
    'hero_destinations': '/uploads/e388c2a9-b60c-4a55-9a72-72c07adcb936.jpg',
    'hero_plan': '/uploads/5c6969ed-4846-4387-9a3a-9fd383a3f793.jpg',
    'hero_visa': '/uploads/5947f859-fdc1-4763-88c9-c4eee59bdabf.jpg',
    'hero_travel_guide': '/uploads/b806e5b2-c8d2-4f5f-beda-82c74312e7d8.jpg',
    'hero_accommodation': '/uploads/134c8632-6429-480e-8264-ec6cba987bd2.jpg',
    'hero_getting_here': '/uploads/1aaa578a-10bd-46b1-ae6b-206dbbc785cc.jpg',
    'hero_weather': '/uploads/df5cbfed-c48e-41f6-88d8-7e80e2964e44.jpg',
    'hero_faqs': '/uploads/f0993b90-26e1-494a-94ac-d45ce4bd780c.jpg',
    'hero_maasai_mara': '/uploads/0017431f-79fb-44e2-8bda-9cf099f228c8.jpg',
    'hero_amboseli': '/uploads/06b80f3b-a788-4c59-8517-8b3ec3e19bc4.jpg',
    'hero_nairobi': '/uploads/55949b46-a821-44b5-b1dc-55d7171a985d.jpg',
    'hero_diani_beach': '/uploads/dcd0a62c-e1a7-4978-87f8-da4282fb75ac.jpg',
    'hero_mount_kenya': '/uploads/06f65f6c-7c32-4d96-b6e7-249367a0004a.jpg',
    'hero_lake_nakuru': '/uploads/85a96d0c-3947-4903-b593-89e55d3e411f.jpg',
    'hero_lamu': '/uploads/c727e0d3-8046-4aa8-a394-5c8cd051f6e9.jpg'
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
        saveCache(FALLBACKS);
        return;
      }
      var imgs = await res.json();
      var merged = mergeWithFallbacks(imgs);
      applyMap(merged);
      saveCache(merged);
    } catch (e) {
      applyMap(FALLBACKS);
      saveCache(FALLBACKS);
    }
  })();
})();
