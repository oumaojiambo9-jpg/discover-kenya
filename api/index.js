const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'discover-kenya-secret-key-2026';
let db = null;

const SITE_IMAGE_KEYS = [
  ['home_pkg_mt-kenya-ol-pejeta-5day', 'Mt Kenya Trek & Ol Pejeta Safari', 'homepage', '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg'],
  ['home_pkg_laikipia-conservancy-4day', 'Laikipia Conservancy Escape', 'homepage', '/IMAGES/Lion/lion.png.jpg'],
  ['home_pkg_solio-ol-pejeta-4day', 'Solio & Ol Pejeta Rhino Trail', 'homepage', '/IMAGES/Elelphant/elephant.png.jpg'],
  ['home_pkg_mt-kenya-lenana-5day', 'Mt Kenya Point Lenana Summit', 'homepage', '/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg'],
  ['home_pkg_northern-kenya-meru-7day', 'Northern Kenya from Meru', 'homepage', '/IMAGES/Maasai/huts.png.jpg'],
  ['home_pkg_luxury-conservancy-custom', 'Private Luxury Conservancy Safari', 'homepage', '/IMAGES/Luxury/luxury.png.jpg'],
  ['story_migration', 'Great Migration', 'stories', null],
  ['story_swahili_coast', 'Swahili Coast', 'stories', null],
  ['story_conservation', 'Conservation', 'stories', null],
  ['story_safari_lodges', 'Safari Lodges', 'stories', null],
  ['story_photography', 'Wildlife Photography', 'stories', null],
  ['story_cuisine', 'Kenyan Cuisine', 'stories', null],
  ['exp_big_five', 'Big Five Safari', 'experiences', null],
  ['exp_coastal_paradise', 'Coastal Paradise', 'experiences', null],
  ['exp_cultural_immersion', 'Cultural Immersion', 'experiences', null],
  ['exp_mount_kenya', 'Mount Kenya Trekking', 'experiences', null],
  ['exp_rift_valley', 'Great Rift Valley', 'experiences', null],
  ['exp_balloon_safari', 'Balloon Safari', 'experiences', null],
  ['hero_home', 'Homepage', 'heroes', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=85'],
  ['hero_experiences', 'Experiences', 'heroes', '/IMAGES/Elelphant/elephant.png.jpg'],
  ['hero_stories', 'Stories', 'heroes', '/IMAGES/Stories/bonfire%20stories.jpg'],
  ['hero_inquire', 'Book / Inquire', 'heroes', '/IMAGES/Inquiring/inquiring.jpg'],
  ['hero_packages', 'Packages', 'heroes', 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80'],
  ['hero_destinations', 'Destinations', 'heroes', 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80'],
  ['hero_plan', 'Plan Your Trip', 'heroes', 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_visa', 'Visa & eTA', 'heroes', 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_travel_guide', 'Travel Guide', 'heroes', 'https://images.pexels.com/photos/2249106/pexels-photo-2249106.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_accommodation', 'Accommodation', 'heroes', 'https://images.pexels.com/photos/1402688/pexels-photo-1402688.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_getting_here', 'Getting Here', 'heroes', 'https://images.pexels.com/photos/4108195/pexels-photo-4108195.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_weather', 'Weather & Seasons', 'heroes', 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1600&q=80'],
  ['hero_faqs', 'FAQs', 'heroes', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80'],
  ['hero_maasai_mara', 'Maasai Mara', 'heroes', 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80'],
  ['hero_amboseli', 'Amboseli', 'heroes', 'https://images.pexels.com/photos/2888307/pexels-photo-2888307.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_nairobi', 'Nairobi', 'heroes', 'https://images.pexels.com/photos/931007/pexels-photo-931007.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_diani_beach', 'Diani Beach', 'heroes', 'https://images.pexels.com/photos/2053950/pexels-photo-2053950.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_mount_kenya', 'Mount Kenya', 'heroes', 'https://images.pexels.com/photos/3807792/pexels-photo-3807792.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_lake_nakuru', 'Lake Nakuru', 'heroes', 'https://images.pexels.com/photos/3326647/pexels-photo-3326647.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
  ['hero_lamu', 'Lamu Island', 'heroes', 'https://images.pexels.com/photos/1148997/pexels-photo-1148997.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80'],
];

function rowsAll(sql, params) {
  params = params || [];
  var stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  var rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function rowGet(sql, params) {
  var rows = rowsAll(sql, params || []);
  return rows.length > 0 ? rows[0] : null;
}
function dbRun(sql, params) {
  db.run(sql, params || []);
  var r = rowGet('SELECT last_insert_rowid() as id');
  return r ? r.id : null;
}

async function ensureDB() {
  if (db) return;
  var SQL = await initSqlJs();
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT "admin", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS packages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, category TEXT DEFAULT "safari", duration TEXT NOT NULL, nights TEXT, price REAL NOT NULL, price_label TEXT DEFAULT "/ person", rating REAL DEFAULT 4.8, review_count INTEGER DEFAULT 0, description TEXT DEFAULT "", highlights TEXT DEFAULT "[]", image_url TEXT, badge TEXT, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS destinations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, region TEXT, description TEXT DEFAULT "", short_desc TEXT, image_url TEXT, hero_image_url TEXT, highlights TEXT, best_time TEXT, lat REAL, lng REAL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, travelers INTEGER, travel_date_start TEXT, travel_date_end TEXT, budget_range TEXT, package_id INTEGER, message TEXT, status TEXT DEFAULT "new", notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT, avatar_url TEXT, rating INTEGER DEFAULT 5, text TEXT NOT NULL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  db.run('CREATE TABLE IF NOT EXISTS site_images (key TEXT PRIMARY KEY, url TEXT DEFAULT NULL, label TEXT, page TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');

  SITE_IMAGE_KEYS.forEach(function(row) {
    db.run('INSERT OR IGNORE INTO site_images (key, label, page, url) VALUES (?, ?, ?, ?)', [row[0], row[1], row[2], row[3] || null]);
  });

  if (rowGet('SELECT COUNT(*) as c FROM users').c === 0) {
    db.run('INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)', ['admin','admin@kibokoadventures.com', bcrypt.hashSync('admin123', 10), 'admin']);
  }

  if (rowGet('SELECT COUNT(*) as c FROM packages').c === 0) {
    var ins = db.prepare('INSERT INTO packages (title,slug,category,duration,nights,price,rating,review_count,description,highlights,image_url,badge,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    var pkgs = [
      ['Mt Kenya Trek & Ol Pejeta Safari','mt-kenya-ol-pejeta-5day','adventure','5 Days','4 Nights',2450,4.9,128,'Summit Point Lenana on Mt Kenya (4,985m), then track the Big Five and endangered rhinos at Ol Pejeta Conservancy — our signature Meru-based itinerary.',JSON.stringify(['Point Lenana summit attempt','Ol Pejeta Big Five game drives','Professional mountain guides','Community-benefit lodges']),'/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg','Signature',1],
      ['Laikipia Conservancy Escape','laikipia-conservancy-4day','safari','4 Days','3 Nights',1890,4.8,86,'Four intimate days tracking lions, elephants, and Grevy\'s zebra across private Laikipia conservancies — small groups, no mass tourism.',JSON.stringify(['Private conservancy access','Daily game drives','Local Meru guides','Full-board bush camps']),'/IMAGES/Lion/lion.png.jpg','Best Seller',1],
      ['Solio & Ol Pejeta Rhino Trail','solio-ol-pejeta-4day','safari','4 Days','3 Nights',1750,4.9,72,'A focused rhino and wildlife safari linking Solio Ranch and Ol Pejeta — Africa\'s strongest black and white rhino sanctuaries.',JSON.stringify(['Solio Ranch rhinos','Ol Pejeta conservancy','Chimpanzee sanctuary visit','Airport transfers from Meru/Nanyuki']),'/IMAGES/Elelphant/elephant.png.jpg','Popular',1],
      ['Mt Kenya Point Lenana Summit','mt-kenya-lenana-5day','adventure','5 Days','4 Nights',2150,4.9,94,'Conquer Point Lenana via the scenic Sirimon route with expert local guides, quality gear, and alpine scenery few operators match.',JSON.stringify(['Sirimon route trek','Summit certificate','Meals & porters included','All camping equipment']),'/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg','Adventure',1],
      ['Northern Kenya from Meru','northern-kenya-meru-7day','safari','7 Days','6 Nights',3280,4.8,61,'Go beyond the beaten path from our Meru base: reticulated giraffe, Grevy\'s zebra, Samburu culture, and remote northern landscapes.',JSON.stringify(['Meru National Park','Samburu / northern specials','Cultural village visit','Full-board lodges & camps']),'/IMAGES/Maasai/huts.png.jpg','Off the Path',1],
      ['Private Luxury Conservancy Safari','luxury-conservancy-custom','luxury','8 Days','7 Nights',5900,5.0,34,'A fully private Laikipia & Mt Kenya journey — exclusive camps, private vehicle and guide, and tailor-made pacing for couples or small groups.',JSON.stringify(['Private safari vehicle & guide','Luxury conservancy lodges','Flexible daily itinerary','Spa & exclusive experiences']),'/IMAGES/Luxury/luxury.png.jpg','Luxury',1]
    ];
    for (var i = 0; i < pkgs.length; i++) { ins.bind(pkgs[i]); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM destinations').c === 0) {
    var ins = db.prepare('INSERT INTO destinations (name,slug,region,description,short_desc,highlights,image_url,featured) VALUES (?,?,?,?,?,?,?,?)');
    var dests = [
      ['Maasai Mara','maasai-mara','Southern','Experience the Maasai Mara.','Home of the Great Migration',JSON.stringify(['Great Migration','Big Five wildlife','Maasai cultural visits','Hot air balloon safaris']),'/IMAGES/Classic%20mara/classic%20mara.jpg',1],
      ['Amboseli','amboseli','Southern','Explore Amboseli National Park.','Elephants against Kilimanjaro',JSON.stringify(['Large elephant herds','Mt Kilimanjaro views','Excellent birding','Photography paradise']),'/IMAGES/Amboseli/amboseli.png.jpg',1],
      ['Nairobi','nairobi','Nairobi and Environs','Discover Nairobi.','The safari capital',JSON.stringify(['Nairobi National Park','Karen Blixen Museum','Giraffe Centre','Vibrant dining scene']),'/IMAGES/Nairobi/nairobi.png.jpg',1],
      ['Diani Beach','diani-beach','Coast','Escape to Diani Beach with pristine white sands and crystal-clear waters.','Kenya coastal gem',JSON.stringify(['White sand beaches','Snorkeling and diving','Dhow cruises','Beachfront resorts']),'/IMAGES/Diani/diani%20beach.png.jpg',1],
      ['Mount Kenya','mount-kenya','Central Highlands','Climb Mount Kenya, a UNESCO World Heritage site with trekking routes and alpine scenery.','Africa second-highest peak',JSON.stringify(['Trekking routes','Alpine scenery','Unique wildlife','UNESCO World Heritage site']),'/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg',1],
      ['Lake Nakuru','lake-nakuru','Rift Valley','Visit Lake Nakuru, famous for flamingos, rhinos, and breathtaking Rift Valley scenery.','Flamingos and rhinos',JSON.stringify(['Flamingo populations','Rhino sanctuary','Rift Valley scenery','Bird watching']),'/IMAGES/Lake%20Nakuru/lake%20nakuru.png.jpg',1],
      ['Lamu Island','lamu','Coast','Explore Lamu Island, a UNESCO World Heritage site with Swahili culture and ancient architecture.','Timeless Swahili shores',JSON.stringify(['UNESCO Old Town','Swahili architecture','Dhow safaris','Pristine beaches']),'/IMAGES/Lamu/lamu.jpg',1]
    ];
    for (var i = 0; i < dests.length; i++) { ins.bind(dests[i]); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM testimonials').c === 0) {
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Sarah H.','London, UK',5,'We summited Point Lenana at sunrise and by evening we were watching a lion pride at Ol Pejeta. The most extraordinary 5 days of my life.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Amara K.','Nairobi, Kenya',5,'The northern Kenya safari from Meru is genuinely off the beaten path. As a solo traveller Kiboko ticked every box.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['James W.','New York, USA',5,'Laikipia conservancy stays felt exclusive and wild. Small groups, real community benefit, and guides who grew up on this land.',1]);
  }
}

function parseBody(req) {
  return new Promise(function(resolve) {
    var body = '';
    req.on('data', function(c) { body += c; });
    req.on('end', function() { try { resolve(body ? JSON.parse(body) : {}); } catch(e) { resolve({}); } });
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
  res.end(JSON.stringify(data));
}

function getUser(req) {
  var h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.split(' ')[1], JWT_SECRET); } catch(e) { return null; }
}

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    return res.end();
  }

  try { await ensureDB(); } catch(e) { return send(res, 500, { error: 'DB init failed' }); }

  var url = req.url.split('?')[0];
  var qs = {};
  var qstr = req.url.split('?')[1] || '';
  if (qstr) { qstr.split('&').forEach(function(p) { var kv = p.split('='); qs[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); }

  try {
    if (url === '/api/auth/login' && req.method === 'POST') {
      var body = await parseBody(req);
      if (!body.username || !body.password) return send(res, 400, { error: 'Username and password required' });
      var user = rowGet('SELECT * FROM users WHERE username = ? OR email = ?', [body.username, body.username]);
      if (!user || !bcrypt.compareSync(body.password, user.password)) return send(res, 401, { error: 'Invalid credentials' });
      var token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return send(res, 200, { token: token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    }

    if (url === '/api/auth/me' && req.method === 'GET') {
      var u = getUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      var me = rowGet('SELECT id, username, email, role FROM users WHERE id = ?', [u.id]);
      return send(res, 200, me);
    }

    if (url === '/api/packages' && req.method === 'GET') {
      var sql = 'SELECT * FROM packages WHERE active = 1';
      var params = [];
      if (qs.featured === '1') { sql += ' AND featured = 1'; }
      if (qs.category) { sql += ' AND category = ?'; params.push(qs.category); }
      sql += ' ORDER BY featured DESC, rating DESC';
      var pkgs = rowsAll(sql, params);
      pkgs.forEach(function(p) { try { p.highlights = JSON.parse(p.highlights); } catch(e) { p.highlights = []; } });
      return send(res, 200, pkgs);
    }

    var pkgM = url.match(/^\/api\/packages\/(.+)$/);
    if (pkgM && req.method === 'GET') {
      var pkg = rowGet('SELECT * FROM packages WHERE slug = ? AND active = 1', [pkgM[1]]);
      if (!pkg) return send(res, 404, { error: 'Not found' });
      try { pkg.highlights = JSON.parse(pkg.highlights); } catch(e) { pkg.highlights = []; }
      return send(res, 200, pkg);
    }

    if (url === '/api/destinations' && req.method === 'GET') {
      var sql = 'SELECT * FROM destinations WHERE active = 1';
      if (qs.featured === '1') sql += ' AND featured = 1';
      sql += ' ORDER BY featured DESC, name ASC';
      var dests = rowsAll(sql);
      dests.forEach(function(d) { if (d.highlights) try { d.highlights = JSON.parse(d.highlights); } catch(e) {} });
      return send(res, 200, dests);
    }

    var destM = url.match(/^\/api\/destinations\/(.+)$/);
    if (destM && req.method === 'GET') {
      var dest = rowGet('SELECT * FROM destinations WHERE slug = ? AND active = 1', [destM[1]]);
      if (!dest) return send(res, 404, { error: 'Not found' });
      if (dest.highlights) try { dest.highlights = JSON.parse(dest.highlights); } catch(e) {}
      return send(res, 200, dest);
    }

    if (url === '/api/testimonials' && req.method === 'GET') {
      var sql = 'SELECT * FROM testimonials WHERE active = 1';
      if (qs.featured === '1') sql += ' AND featured = 1';
      sql += ' ORDER BY featured DESC';
      return send(res, 200, rowsAll(sql));
    }

    if (url === '/api/site-images' && req.method === 'GET') {
      var rows = rowsAll('SELECT key, url FROM site_images');
      var map = {};
      rows.forEach(function(r) { map[r.key] = r.url || null; });
      return send(res, 200, map);
    }

    if (url === '/api/inquiries' && req.method === 'POST') {
      var body = await parseBody(req);
      if (!body.name || !body.email) return send(res, 400, { error: 'Name and email required' });
      dbRun('INSERT INTO inquiries (name,email,phone,travelers,travel_date_start,travel_date_end,budget_range,package_id,message) VALUES (?,?,?,?,?,?,?,?,?)', [body.name, body.email, body.phone || null, body.travelers || null, body.travel_date_start || null, body.travel_date_end || null, body.budget_range || null, body.package_id || null, body.message || null]);
      return send(res, 201, { message: 'Inquiry submitted successfully' });
    }

    if (url === '/api/newsletter' && req.method === 'POST') {
      var body = await parseBody(req);
      if (!body.email) return send(res, 400, { error: 'Email required' });
      var exist = rowGet('SELECT * FROM newsletters WHERE email = ?', [body.email]);
      if (exist) return send(res, 200, { message: 'Already subscribed!' });
      dbRun('INSERT INTO newsletters (email,name) VALUES (?,?)', [body.email, body.name || null]);
      return send(res, 201, { message: 'Subscribed successfully!' });
    }

    if (url.startsWith('/api/admin/')) {
      var u = getUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });

      if (url === '/api/admin/stats' && req.method === 'GET') {
        return send(res, 200, {
          total_packages: rowGet('SELECT COUNT(*) as c FROM packages').c,
          active_packages: rowGet('SELECT COUNT(*) as c FROM packages WHERE active = 1').c,
          total_destinations: rowGet('SELECT COUNT(*) as c FROM destinations').c,
          total_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries').c,
          new_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries WHERE status = ?', ['new']).c,
          total_subscribers: rowGet('SELECT COUNT(*) as c FROM newsletters').c,
          total_testimonials: rowGet('SELECT COUNT(*) as c FROM testimonials').c,
          recent_inquiries: rowsAll('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 5')
        });
      }

      if (url === '/api/admin/inquiries' && req.method === 'GET') {
        return send(res, 200, rowsAll('SELECT i.*, p.title as package_title FROM inquiries i LEFT JOIN packages p ON i.package_id = p.id ORDER BY i.created_at DESC'));
      }
      var inqM = url.match(/^\/api\/admin\/inquiries\/(\d+)$/);
      if (inqM && req.method === 'PATCH') {
        var body = await parseBody(req);
        db.run('UPDATE inquiries SET status = COALESCE(?,status), notes = COALESCE(?,notes) WHERE id = ?', [body.status || null, body.notes !== undefined ? body.notes : null, parseInt(inqM[1])]);
        return send(res, 200, { message: 'Updated' });
      }
      if (inqM && req.method === 'DELETE') {
        db.run('DELETE FROM inquiries WHERE id = ?', [parseInt(inqM[1])]);
        return send(res, 200, { message: 'Deleted' });
      }

      if (url === '/api/admin/packages' && req.method === 'GET') {
        var pkgs = rowsAll('SELECT * FROM packages ORDER BY created_at DESC');
        pkgs.forEach(function(p) { try { p.highlights = JSON.parse(p.highlights); } catch(e) { p.highlights = []; } });
        return send(res, 200, pkgs);
      }
      if (url === '/api/admin/destinations' && req.method === 'GET') {
        return send(res, 200, rowsAll('SELECT * FROM destinations ORDER BY created_at DESC'));
      }
      if (url === '/api/admin/testimonials' && req.method === 'GET') {
        return send(res, 200, rowsAll('SELECT * FROM testimonials ORDER BY created_at DESC'));
      }
      if (url === '/api/admin/newsletters' && req.method === 'GET') {
        return send(res, 200, rowsAll('SELECT * FROM newsletters ORDER BY created_at DESC'));
      }

      if (url === '/api/admin/site-images' && req.method === 'GET') {
        return send(res, 200, rowsAll('SELECT * FROM site_images ORDER BY page, key'));
      }
      var siteImgM = url.match(/^\/api\/admin\/site-images\/(.+)$/);
      if (siteImgM && req.method === 'PUT') {
        var body = await parseBody(req);
        var existing = rowGet('SELECT key FROM site_images WHERE key = ?', [siteImgM[1]]);
        if (!existing) return send(res, 404, { error: 'Image key not found' });
        db.run('UPDATE site_images SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [body.url || null, siteImgM[1]]);
        return send(res, 200, { message: 'Site image updated' });
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch(e) {
    return send(res, 500, { error: e.message });
  }
};
