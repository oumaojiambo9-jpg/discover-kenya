const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'discover-kenya-vercel-secret';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db;

function rowsAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function rowGet(sql, params = []) {
  const rows = rowsAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
function dbRun(sql, params = []) {
  db.run(sql, params);
  const r = rowGet('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: r ? r.id : null };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

let ready = false;

async function init() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS packages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, category TEXT DEFAULT 'safari', duration TEXT NOT NULL, nights TEXT, price REAL NOT NULL, price_label TEXT DEFAULT '/ person', rating REAL DEFAULT 4.8, review_count INTEGER DEFAULT 0, description TEXT NOT NULL DEFAULT '', highlights TEXT NOT NULL DEFAULT '[]', image_url TEXT, badge TEXT, itinerary TEXT, included TEXT, excluded TEXT, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS destinations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, region TEXT, description TEXT NOT NULL DEFAULT '', short_desc TEXT, image_url TEXT, hero_image_url TEXT, highlights TEXT, best_time TEXT, getting_there TEXT, wildlife TEXT, culture TEXT, activities TEXT, lat REAL, lng REAL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, travelers INTEGER, travel_date_start TEXT, travel_date_end TEXT, budget_range TEXT, package_id INTEGER, message TEXT, status TEXT DEFAULT 'new', notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT, avatar_url TEXT, rating INTEGER DEFAULT 5, text TEXT NOT NULL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  if (rowGet('SELECT COUNT(*) as c FROM users').c === 0) {
    db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', ['admin', 'admin@discoverkenya.com', bcrypt.hashSync('admin123', 10), 'admin']);
  }

  if (rowGet('SELECT COUNT(*) as c FROM packages').c === 0) {
    const pkgs = [
      ['Classic Mara Safari','classic-mara-safari','safari','7 Days','6 Nights',2450,4.9,128,'Witness the Great Migration, visit Maasai villages, enjoy game drives, and end with a hot air balloon safari over the Mara.','["Full-board accommodation","Daily game drives","Park fees included","Airport transfers"]',null,'Best Seller',1],
      ['Safari & Beach Combo','safari-beach-combo','combo','10 Days','9 Nights',3280,4.8,94,'Combine the thrill of a 5-day safari with 5 days of pure beach bliss on the pristine white sands of Diani Beach.','["5 days safari + 5 days beach","All flights & transfers","Snorkeling & dhow cruise","Half-board beach resort"]',null,'Popular',1],
      ['Cultural Heritage Trail','cultural-heritage-trail','culture','5 Days','4 Nights',1890,4.7,63,'Immerse yourself in Kenya\'s rich cultures.','["Guided village visits","Cultural performances","Local cuisine experiences","Nairobi city tour"]',null,null,1],
      ['Mount Kenya Trekking Expedition','mount-kenya-trekking','adventure','8 Days','7 Nights',2150,4.9,47,'Conquer Africa\'s second-highest peak via the scenic Sirimon route.','["Professional mountain guides","All camping equipment","Meals & porters included","Summit certificate"]',null,null,1],
      ['Ultimate Luxury Safari','ultimate-luxury-safari','luxury','12 Days','11 Nights',8900,5.0,34,'Experience Kenya at its finest — private charters, award-winning lodges, champagne sunsets, and exclusive wildlife encounters.','["Private safari vehicle","Luxury all-inclusive lodges","Private guide & chef","Spa & wellness included"]',null,'Luxury',1],
      ['Family Adventure Safari','family-adventure-safari','family','9 Days','8 Nights',3450,4.8,72,'A family-friendly journey with kid-friendly lodges, educational game drives, beach time, and cultural activities for all ages.','["Family-friendly lodges","Kids\' safari program","Child discounts available","Beach & pool time"]',null,'Family',1]
    ];
    const ins = db.prepare('INSERT INTO packages (title,slug,category,duration,nights,price,rating,review_count,description,highlights,image_url,badge,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const p of pkgs) { ins.bind(p); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM destinations').c === 0) {
    const dests = [
      ['Maasai Mara','maasai-mara','Southern','Experience the Maasai Mara — Africa\'s most iconic wildlife reserve. Witness the Great Migration, the Big Five, and authentic Maasai culture.','Home of the Great Migration','["Great Migration (Jul-Oct)","Big Five wildlife","Maasai cultural visits","Hot air balloon safaris"]',1],
      ['Amboseli','amboseli','Southern','Explore Amboseli National Park — home to large elephant herds and stunning views of Mount Kilimanjaro.','Elephants against Kilimanjaro','["Large elephant herds","Mt Kilimanjaro views","Excellent birding","Photography paradise"]',1],
      ['Nairobi','nairobi','Nairobi & Environs','Discover Nairobi — Kenya\'s vibrant capital.','The safari capital','["Nairobi National Park","Karen Blixen Museum","Giraffe Centre","Vibrant dining scene"]',1],
      ['Diani Beach','diani-beach','Coast','Escape to Diani Beach — pristine white sands, crystal-clear waters, and world-class resorts.','Kenya\'s coastal gem','["White sand beaches","Snorkeling & diving","Dhow cruises","Beachfront resorts"]',1],
      ['Mount Kenya','mount-kenya','Central Highlands','Climb Mount Kenya — a UNESCO World Heritage site.','Africa\'s second-highest peak','["Trekking routes","Alpine scenery","Unique wildlife","UNESCO World Heritage site"]',1],
      ['Lake Nakuru','lake-nakuru','Rift Valley','Visit Lake Nakuru — famous for flamingos, rhinos, and breathtaking Rift Valley scenery.','Flamingos & rhinos','["Flamingo populations","Rhino sanctuary","Rift Valley scenery","Bird watching"]',1],
      ['Lamu Island','lamu','Coast','Explore Lamu Island — a UNESCO World Heritage site with Swahili culture and ancient architecture.','Timeless Swahili shores','["UNESCO Old Town","Swahili architecture","Dhow safaris","Pristine beaches"]',1]
    ];
    const ins = db.prepare('INSERT INTO destinations (name,slug,region,description,short_desc,highlights,featured) VALUES (?,?,?,?,?,?,?)');
    for (const d of dests) { ins.bind(d); ins.step(); ins.reset(); }
    ins.free();
  }

  if (rowGet('SELECT COUNT(*) as c FROM testimonials').c === 0) {
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Sarah Mitchell','London, UK',5,'An absolutely life-changing experience. Watching the Great Migration from a hot air balloon at sunrise is something I will never forget.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['James Walker','New York, USA',5,'From the Maasai Mara to Diani Beach, every moment was magical. The Kenyan people are the warmest I\'ve ever met.',1]);
    db.run('INSERT INTO testimonials (name,location,rating,text,featured) VALUES (?,?,?,?,?)', ['Emma Chen','Beijing, China',5,'Climbing Mount Kenya was the challenge of a lifetime. Kenya offers adventure and serenity in one incredible package.',1]);
  }

  ready = true;
}

const handler = async (req, res) => {
  if (!ready) {
    try { await init(); } catch (e) { return res.status(500).json({ error: 'DB init failed', detail: e.message }); }
  }

  const method = req.method;
  const pathname = req.url.split('?')[0];
  const query = Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || ''));

  try {
    // Auth
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      const user = rowGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
      if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    }

    // Packages
    if (pathname === '/api/packages' && method === 'GET') {
      let sql = 'SELECT * FROM packages WHERE active = 1';
      const params = [];
      if (query.featured === '1') sql += ' AND featured = 1';
      if (query.category) { sql += ' AND category = ?'; params.push(query.category); }
      sql += ' ORDER BY featured DESC, rating DESC, created_at DESC';
      const pkgs = rowsAll(sql, params);
      pkgs.forEach(p => { try { p.highlights = JSON.parse(p.highlights); } catch {} });
      return res.json(pkgs);
    }

    const pkgMatch = pathname.match(/^\/api\/packages\/(.+)$/);
    if (pkgMatch && method === 'GET') {
      const pkg = rowGet('SELECT * FROM packages WHERE slug = ? AND active = 1', [pkgMatch[1]]);
      if (!pkg) return res.status(404).json({ error: 'Package not found' });
      try { pkg.highlights = JSON.parse(pkg.highlights); } catch {}
      return res.json(pkg);
    }

    // Destinations
    if (pathname === '/api/destinations' && method === 'GET') {
      let sql = 'SELECT id, name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng, featured FROM destinations WHERE active = 1';
      if (query.featured === '1') sql += ' AND featured = 1';
      sql += ' ORDER BY featured DESC, name ASC';
      const dests = rowsAll(sql);
      dests.forEach(d => { if (d.highlights) try { d.highlights = JSON.parse(d.highlights); } catch {} });
      return res.json(dests);
    }

    const destMatch = pathname.match(/^\/api\/destinations\/(.+)$/);
    if (destMatch && method === 'GET') {
      const dest = rowGet('SELECT * FROM destinations WHERE slug = ? AND active = 1', [destMatch[1]]);
      if (!dest) return res.status(404).json({ error: 'Destination not found' });
      if (dest.highlights) try { dest.highlights = JSON.parse(dest.highlights); } catch {}
      return res.json(dest);
    }

    // Testimonials
    if (pathname === '/api/testimonials' && method === 'GET') {
      let sql = 'SELECT * FROM testimonials WHERE active = 1';
      if (query.featured === '1') sql += ' AND featured = 1';
      sql += ' ORDER BY featured DESC, created_at DESC';
      return res.json(rowsAll(sql));
    }

    // Inquiries
    if (pathname === '/api/inquiries' && method === 'POST') {
      const { name, email, phone, travelers, travel_date_start, travel_date_end, budget_range, package_id, message } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
      dbRun('INSERT INTO inquiries (name, email, phone, travelers, travel_date_start, travel_date_end, budget_range, package_id, message) VALUES (?,?,?,?,?,?,?,?,?)',
        [name, email, phone || null, travelers || null, travel_date_start || null, travel_date_end || null, budget_range || null, package_id || null, message || null]);
      return res.status(201).json({ message: 'Inquiry submitted successfully' });
    }

    // Newsletter
    if (pathname === '/api/newsletter' && method === 'POST') {
      const { email, name } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const exist = rowGet('SELECT * FROM newsletters WHERE email = ?', [email]);
      if (exist) return res.json({ message: 'Already subscribed!' });
      dbRun('INSERT INTO newsletters (email, name) VALUES (?,?)', [email, name || null]);
      return res.status(201).json({ message: 'Subscribed successfully!' });
    }

    // Auth check
    if (pathname === '/api/auth/me' && method === 'GET') {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      try {
        const user = jwt.verify(header.split(' ')[1], JWT_SECRET);
        const u = rowGet('SELECT id, username, email, role FROM users WHERE id = ?', [user.id]);
        return res.json(u);
      } catch { return res.status(401).json({ error: 'Invalid token' }); }
    }

    // Admin endpoints
    if (pathname.startsWith('/api/admin/')) {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      let user;
      try { user = jwt.verify(header.split(' ')[1], JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

      // Stats
      if (pathname === '/api/admin/stats' && method === 'GET') {
        return res.json({
          total_packages: rowGet('SELECT COUNT(*) as c FROM packages').c,
          active_packages: rowGet('SELECT COUNT(*) as c FROM packages WHERE active = 1').c,
          total_destinations: rowGet('SELECT COUNT(*) as c FROM destinations').c,
          total_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries').c,
          new_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries WHERE status = ?', ['new']).c,
          total_subscribers: rowGet('SELECT COUNT(*) as c FROM newsletters').c,
          total_testimonials: rowGet('SELECT COUNT(*) as c FROM testimonials').c,
          recent_inquiries: rowsAll('SELECT i.*, p.title as package_title FROM inquiries i LEFT JOIN packages p ON i.package_id = p.id ORDER BY i.created_at DESC LIMIT 5')
        });
      }

      // Inquiries
      if (pathname === '/api/admin/inquiries' && method === 'GET') {
        const sort = query.sort === 'oldest' ? 'ASC' : 'DESC';
        return res.json(rowsAll(`SELECT i.*, p.title as package_title FROM inquiries i LEFT JOIN packages p ON i.package_id = p.id ORDER BY i.created_at ${sort}`));
      }

      const inqMatch = pathname.match(/^\/api\/admin\/inquiries\/(\d+)$/);
      if (inqMatch && method === 'PATCH') {
        const { status, notes } = req.body;
        db.run('UPDATE inquiries SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?', [status || null, notes !== undefined ? notes : null, inqMatch[1]]);
        return res.json({ message: 'Inquiry updated' });
      }
      if (inqMatch && method === 'DELETE') {
        db.run('DELETE FROM inquiries WHERE id = ?', [inqMatch[1]]);
        return res.json({ message: 'Inquiry deleted' });
      }

      // Newsletters
      if (pathname === '/api/admin/newsletters' && method === 'GET') {
        return res.json(rowsAll('SELECT * FROM newsletters ORDER BY created_at DESC'));
      }

      // Packages
      if (pathname === '/api/admin/packages' && method === 'GET') {
        const pkgs = rowsAll('SELECT * FROM packages ORDER BY created_at DESC');
        pkgs.forEach(p => { try { p.highlights = JSON.parse(p.highlights); } catch {} });
        return res.json(pkgs);
      }
      if (pathname === '/api/admin/packages' && method === 'POST') {
        const { title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights, image_url, badge, featured } = req.body;
        if (!title || !slug || !duration || !price) return res.status(400).json({ error: 'Title, slug, duration, and price are required' });
        dbRun('INSERT INTO packages (title,slug,category,duration,nights,price,price_label,rating,review_count,description,highlights,image_url,badge,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [title, slug, category || 'safari', duration, nights || null, price, price_label || '/ person', rating || 4.8, review_count || 0, description || '', JSON.stringify(highlights || []), image_url || null, badge || null, featured ? 1 : 0]);
        return res.status(201).json({ message: 'Package created' });
      }

      const pkgAdminMatch = pathname.match(/^\/api\/admin\/packages\/(\d+)$/);
      if (pkgAdminMatch && method === 'PUT') {
        const existing = rowGet('SELECT * FROM packages WHERE id = ?', [pkgAdminMatch[1]]);
        if (!existing) return res.status(404).json({ error: 'Package not found' });
        const { title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights, image_url, badge, featured, active } = req.body;
        db.run('UPDATE packages SET title=COALESCE(?,title), slug=COALESCE(?,slug), category=COALESCE(?,category), duration=COALESCE(?,duration), nights=COALESCE(?,nights), price=COALESCE(?,price), price_label=COALESCE(?,price_label), rating=COALESCE(?,rating), review_count=COALESCE(?,review_count), description=COALESCE(?,description), highlights=?, image_url=COALESCE(?,image_url), badge=?, featured=COALESCE(?,featured), active=COALESCE(?,active), updated_at=CURRENT_TIMESTAMP WHERE id=?',
          [title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights ? JSON.stringify(highlights) : existing.highlights, image_url, badge !== undefined ? badge : existing.badge, featured, active, pkgAdminMatch[1]]);
        return res.json({ message: 'Package updated' });
      }
      if (pkgAdminMatch && method === 'DELETE') {
        db.run('DELETE FROM packages WHERE id = ?', [pkgAdminMatch[1]]);
        return res.json({ message: 'Package deleted' });
      }

      // Destinations
      if (pathname === '/api/admin/destinations' && method === 'GET') return res.json(rowsAll('SELECT * FROM destinations ORDER BY created_at DESC'));
      if (pathname === '/api/admin/destinations' && method === 'POST') {
        const { name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng } = req.body;
        if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
        dbRun('INSERT INTO destinations (name,slug,region,description,short_desc,image_url,hero_image_url,highlights,best_time,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [name, slug, region || null, description || '', short_desc || null, image_url || null, hero_image_url || null, JSON.stringify(highlights || []), best_time || null, lat || null, lng || null]);
        return res.status(201).json({ message: 'Destination created' });
      }

      const destAdminMatch = pathname.match(/^\/api\/admin\/destinations\/(\d+)$/);
      if (destAdminMatch && method === 'PUT') {
        const { name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng, active } = req.body;
        db.run('UPDATE destinations SET name=COALESCE(?,name), slug=COALESCE(?,slug), region=COALESCE(?,region), description=COALESCE(?,description), short_desc=COALESCE(?,short_desc), image_url=COALESCE(?,image_url), hero_image_url=COALESCE(?,hero_image_url), highlights=?, best_time=COALESCE(?,best_time), lat=COALESCE(?,lat), lng=COALESCE(?,lng), active=COALESCE(?,active), updated_at=CURRENT_TIMESTAMP WHERE id=?',
          [name, slug, region, description, short_desc, image_url, hero_image_url, highlights ? JSON.stringify(highlights) : '[]', best_time, lat, lng, active, destAdminMatch[1]]);
        return res.json({ message: 'Destination updated' });
      }
      if (destAdminMatch && method === 'DELETE') {
        db.run('DELETE FROM destinations WHERE id = ?', [destAdminMatch[1]]);
        return res.json({ message: 'Destination deleted' });
      }

      // Testimonials
      if (pathname === '/api/admin/testimonials' && method === 'GET') return res.json(rowsAll('SELECT * FROM testimonials ORDER BY created_at DESC'));
      if (pathname === '/api/admin/testimonials' && method === 'POST') {
        const { name, location, avatar_url, rating, text, featured } = req.body;
        if (!name || !text) return res.status(400).json({ error: 'Name and text are required' });
        dbRun('INSERT INTO testimonials (name,location,avatar_url,rating,text,featured) VALUES (?,?,?,?,?,?)',
          [name, location || null, avatar_url || null, rating || 5, text, featured ? 1 : 0]);
        return res.status(201).json({ message: 'Testimonial created' });
      }

      const testAdminMatch = pathname.match(/^\/api\/admin\/testimonials\/(\d+)$/);
      if (testAdminMatch && method === 'PUT') {
        const { name, location, avatar_url, rating, text, featured, active } = req.body;
        db.run('UPDATE testimonials SET name=COALESCE(?,name), location=COALESCE(?,location), avatar_url=COALESCE(?,avatar_url), rating=COALESCE(?,rating), text=COALESCE(?,text), featured=COALESCE(?,featured), active=COALESCE(?,active) WHERE id=?',
          [name, location, avatar_url, rating, text, featured, active, testAdminMatch[1]]);
        return res.json({ message: 'Testimonial updated' });
      }
      if (testAdminMatch && method === 'DELETE') {
        db.run('DELETE FROM testimonials WHERE id = ?', [testAdminMatch[1]]);
        return res.json({ message: 'Testimonial deleted' });
      }
    }

    // Admin dashboard
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const adminPath = path.join(__dirname, '..', 'backend', 'admin', 'index.html');
      if (fs.existsSync(adminPath)) return res.send(fs.readFileSync(adminPath));
    }

    // Static files
    const publicDir = path.join(__dirname, '..');
    if (!pathname.startsWith('/api/')) {
      const filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
      if (filePath.startsWith(publicDir) && fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
        const ext = path.extname(filePath);
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' }[ext] || 'text/plain';
        res.setHeader('Content-Type', mime);
        return res.send(fs.readFileSync(filePath));
      }
      return res.send(fs.readFileSync(path.join(publicDir, 'index.html')));
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

module.exports = handler;
