const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dk-vercel-secret-2026';
let db = null;

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

  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT "admin")');
  db.run('CREATE TABLE IF NOT EXISTS packages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, category TEXT DEFAULT "safari", duration TEXT NOT NULL, nights TEXT, price REAL NOT NULL, price_label TEXT DEFAULT "/ person", rating REAL DEFAULT 4.8, review_count INTEGER DEFAULT 0, description TEXT DEFAULT "", highlights TEXT DEFAULT "[]", image_url TEXT, badge TEXT, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1)');
  db.run('CREATE TABLE IF NOT EXISTS destinations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, region TEXT, description TEXT DEFAULT "", short_desc TEXT, image_url TEXT, highlights TEXT, best_time TEXT, lat REAL, lng REAL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1)');
  db.run('CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, travelers INTEGER, travel_date_start TEXT, travel_date_end TEXT, budget_range TEXT, package_id INTEGER, message TEXT, status TEXT DEFAULT "new", notes TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT, active INTEGER DEFAULT 1)');
  db.run('CREATE TABLE IF NOT EXISTS testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT, rating INTEGER DEFAULT 5, text TEXT NOT NULL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1)');

  if (rowGet('SELECT COUNT(*) as c FROM users').c === 0) {
    db.run('INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)', ['admin','admin@discoverkenya.com', bcrypt.hashSync('admin123', 10), 'admin']);
  }

  if (rowGet('SELECT COUNT(*) as c FROM packages').c === 0) {
    var ins = db.prepare('INSERT INTO packages (title,slug,category,duration,nights,price,rating,review_count,description,highlights,image_url,badge,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    var pkgs = [
      ['Classic Mara Safari','classic-mara-safari','safari','7 Days','6 Nights',2450,4.9,128,'Witness the Great Migration, visit Maasai villages, enjoy game drives, and end with a hot air balloon safari over the Mara.',JSON.stringify(['Full-board accommodation','Daily game drives','Park fees included','Airport transfers']),null,'Best Seller',1],
      ['Safari & Beach Combo','safari-beach-combo','combo','10 Days','9 Nights',3280,4.8,94,'Combine the thrill of a 5-day safari with 5 days of pure beach bliss on the pristine white sands of Diani Beach.',JSON.stringify(['5 days safari + 5 days beach','All flights & transfers','Snorkeling & dhow cruise','Half-board beach resort']),null,'Popular',1],
      ['Cultural Heritage Trail','cultural-heritage-trail','culture','5 Days','4 Nights',1890,4.7,63,'Immerse yourself in Kenya rich cultures.',JSON.stringify(['Guided village visits','Cultural performances','Local cuisine experiences','Nairobi city tour']),null,null,1],
      ['Mount Kenya Trekking Expedition','mount-kenya-trekking','adventure','8 Days','7 Nights',2150,4.9,47,'Conquer Africa second-highest peak via the scenic Sirimon route.',JSON.stringify(['Professional mountain guides','All camping equipment','Meals and porters included','Summit certificate']),null,null,1],
      ['Ultimate Luxury Safari','ultimate-luxury-safari','luxury','12 Days','11 Nights',8900,5.0,34,'Experience Kenya at its finest.',JSON.stringify(['Private safari vehicle','Luxury all-inclusive lodges','Private guide and chef','Spa and wellness included']),null,'Luxury',1],
      ['Family Adventure Safari','family-adventure-safari','family','9 Days','8 Nights',3450,4.8,72,'A family-friendly journey with kid-friendly lodges, educational game drives, beach time, and cultural activities for all ages.',JSON.stringify(['Family-friendly lodges','Kids safari program','Child discounts available','Beach and pool time']),null,'Family',1]
    ];
    for (var i = 0; i < pkgs.length; i++) { ins.bind(pkgs[i]); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM destinations').c === 0) {
    var ins = db.prepare('INSERT INTO destinations (name,slug,region,description,short_desc,highlights,featured) VALUES (?,?,?,?,?,?,?)');
    var dests = [
      ['Maasai Mara','maasai-mara','Southern','Experience the Maasai Mara.','Home of the Great Migration',JSON.stringify(['Great Migration','Big Five wildlife','Maasai cultural visits','Hot air balloon safaris']),1],
      ['Amboseli','amboseli','Southern','Explore Amboseli National Park.','Elephants against Kilimanjaro',JSON.stringify(['Large elephant herds','Mt Kilimanjaro views','Excellent birding','Photography paradise']),1],
      ['Nairobi','nairobi','Nairobi and Environs','Discover Nairobi.','The safari capital',JSON.stringify(['Nairobi National Park','Karen Blixen Museum','Giraffe Centre','Vibrant dining scene']),1],
      ['Diani Beach','diani-beach','Coast','Escape to Diani Beach with pristine white sands and crystal-clear waters.','Kenya coastal gem',JSON.stringify(['White sand beaches','Snorkeling and diving','Dhow cruises','Beachfront resorts']),1],
      ['Mount Kenya','mount-kenya','Central Highlands','Climb Mount Kenya, a UNESCO World Heritage site with trekking routes and alpine scenery.','Africa second-highest peak',JSON.stringify(['Trekking routes','Alpine scenery','Unique wildlife','UNESCO World Heritage site']),1],
      ['Lake Nakuru','lake-nakuru','Rift Valley','Visit Lake Nakuru, famous for flamingos, rhinos, and breathtaking Rift Valley scenery.','Flamingos and rhinos',JSON.stringify(['Flamingo populations','Rhino sanctuary','Rift Valley scenery','Bird watching']),1],
      ['Lamu Island','lamu','Coast','Explore Lamu Island, a UNESCO World Heritage site with Swahili culture and ancient architecture.','Timeless Swahili shores',JSON.stringify(['UNESCO Old Town','Swahili architecture','Dhow safaris','Pristine beaches']),1]
    ];
    for (var i = 0; i < dests.length; i++) { ins.bind(dests[i]); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM testimonials').c === 0) {
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Sarah Mitchell','London, UK',5,'An absolutely life-changing experience. Watching the Great Migration from a hot air balloon at sunrise is something I will never forget.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['James Walker','New York, USA',5,'From the Maasai Mara to Diani Beach, every moment was magical.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Emma Chen','Beijing, China',5,'Climbing Mount Kenya was the challenge of a lifetime. Kenya offers adventure and serenity.',1]);
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
    }

    return send(res, 404, { error: 'Not found' });
  } catch(e) {
    return send(res, 500, { error: e.message });
  }
};
