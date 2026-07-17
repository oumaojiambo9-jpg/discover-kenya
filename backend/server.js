const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'discover-kenya-secret-key-2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// ── Uploads folder ──
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|avif|svg/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
                allowed.test(file.mimetype.split('/')[1]);
    ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

let db;

function loadDB() {
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'discover-kenya.db');
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
}

const SQL_PROMISE = initSqlJs().then(SQL => {
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'discover-kenya.db');
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  return db;
});

function rowsAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) { rows.push(stmt.getAsObject()); }
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

function saveDB() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dbPath = path.join(__dirname, 'data', 'discover-kenya.db');
    fs.writeFileSync(dbPath, buffer);
  } catch (e) { console.error('Save DB error:', e.message); }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

SQL_PROMISE.then(() => {

// ── Site Images table (editorial / non-DB images) ──
db.run(`CREATE TABLE IF NOT EXISTS site_images (
  key TEXT PRIMARY KEY,
  url TEXT DEFAULT NULL,
  label TEXT,
  page TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
[
  // Homepage package cards + editorial images (synced with live api/index.js + local CMS)
  ['home_pkg_mt-kenya-ol-pejeta-5day',   'Mt Kenya Trek & Ol Pejeta Safari',  'homepage', '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg'],
  ['home_pkg_laikipia-conservancy-4day', 'Laikipia Conservancy Escape',       'homepage', '/uploads/6895a494-4851-4b8c-ad0e-0e5f458b290d.jpg'],
  ['home_pkg_solio-ol-pejeta-4day',      'Solio & Ol Pejeta Rhino Trail',     'homepage', '/uploads/48518b61-7c55-4807-b349-1dd9bda2146a.jpg'],
  ['home_pkg_mt-kenya-lenana-5day',      'Mt Kenya Point Lenana Summit',      'homepage', '/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg'],
  ['home_pkg_northern-kenya-meru-7day',  'Northern Kenya from Meru',          'homepage', '/IMAGES/Maasai/huts.png.jpg'],
  ['home_pkg_luxury-conservancy-custom', 'Private Luxury Conservancy Safari', 'homepage', '/uploads/18e799d4-bd29-44cf-a5ea-054a6d34f401.jpg'],
  ['story_migration',       'Great Migration',             'stories', '/uploads/28c06eec-3a1d-4d74-8435-b6497532f590.jpg'],
  ['story_swahili_coast',   'Swahili Coast',               'stories', '/uploads/e3037827-d217-4d41-90fe-f3d05f3c77ed.jpg'],
  ['story_conservation',    'Conservation',                'stories', '/uploads/ae911d00-4144-4372-8e7d-d935a8f78a71.jpg'],
  ['story_safari_lodges',   'Safari Lodges',               'stories', '/uploads/715767cc-5cf1-4079-8039-5a4fbcd3ccf0.jpg'],
  ['story_photography',     'Wildlife Photography',        'stories', '/uploads/dff7d9b7-8893-455a-8895-a5206533339a.jpg'],
  ['story_cuisine',         'Kenyan Cuisine',              'stories', '/uploads/df9e0a0d-bc5a-426e-9f1d-086ecd7d61fa.jpg'],
  ['exp_big_five',          'Big Five Safari',             'experiences', '/uploads/77daf644-e997-4f13-96ed-f8448a77d2a6.jpg'],
  ['exp_coastal_paradise',  'Coastal Paradise',            'experiences', '/uploads/c6813b13-9419-4832-adc2-d316d74477ae.jpg'],
  ['exp_cultural_immersion','Cultural Immersion',          'experiences', '/uploads/b54110fd-be9e-4adc-9d39-4fa671398963.jpg'],
  ['exp_mount_kenya',       'Mount Kenya Trekking',        'experiences', '/uploads/3af6a218-5524-4344-98bb-102a3c1a4a8a.jpg'],
  ['exp_rift_valley',       'Great Rift Valley',           'experiences', '/uploads/7a2b9603-ea48-4e4b-b7fc-21c2af8c8b25.jpg'],
  ['exp_balloon_safari',    'Balloon Safari',              'experiences', '/uploads/ffc16e42-71da-4b38-97b0-ee02072b13af.jpg'],
  // Page hero banners (editable in Admin → Hero Images)
  ['hero_home',             'Homepage',                    'heroes', '/uploads/0cc17d14-ee85-4ac7-8809-aee5c23a05cd.jpg'],
  ['hero_experiences',      'Experiences',                 'heroes', '/IMAGES/Elelphant/elephant.png.jpg'],
  ['hero_stories',          'Stories',                     'heroes', '/IMAGES/Stories/bonfire%20stories.jpg'],
  ['hero_inquire',          'Book / Inquire',              'heroes', '/IMAGES/Inquiring/inquiring.jpg'],
  ['hero_packages',         'Packages',                    'heroes', '/IMAGES/Classic%20mara/classic%20mara.jpg'],
  ['hero_destinations',     'Destinations',                'heroes', '/uploads/e388c2a9-b60c-4a55-9a72-72c07adcb936.jpg'],
  ['hero_plan',             'Plan Your Trip',              'heroes', '/uploads/5c6969ed-4846-4387-9a3a-9fd383a3f793.jpg'],
  ['hero_visa',             'Visa & eTA',                  'heroes', '/uploads/5947f859-fdc1-4763-88c9-c4eee59bdabf.jpg'],
  ['hero_travel_guide',     'Travel Guide',                'heroes', '/uploads/b806e5b2-c8d2-4f5f-beda-82c74312e7d8.jpg'],
  ['hero_accommodation',    'Accommodation',               'heroes', '/uploads/134c8632-6429-480e-8264-ec6cba987bd2.jpg'],
  ['hero_getting_here',     'Getting Here',                'heroes', '/uploads/1aaa578a-10bd-46b1-ae6b-206dbbc785cc.jpg'],
  ['hero_weather',          'Weather & Seasons',           'heroes', '/uploads/df5cbfed-c48e-41f6-88d8-7e80e2964e44.jpg'],
  ['hero_faqs',             'FAQs',                        'heroes', '/uploads/f0993b90-26e1-494a-94ac-d45ce4bd780c.jpg'],
  ['hero_maasai_mara',      'Maasai Mara',                 'heroes', '/uploads/0017431f-79fb-44e2-8bda-9cf099f228c8.jpg'],
  ['hero_amboseli',         'Amboseli',                    'heroes', '/uploads/06b80f3b-a788-4c59-8517-8b3ec3e19bc4.jpg'],
  ['hero_nairobi',          'Nairobi',                     'heroes', '/uploads/55949b46-a821-44b5-b1dc-55d7171a985d.jpg'],
  ['hero_diani_beach',      'Diani Beach',                 'heroes', '/uploads/dcd0a62c-e1a7-4978-87f8-da4282fb75ac.jpg'],
  ['hero_mount_kenya',      'Mount Kenya',                 'heroes', '/uploads/06f65f6c-7c32-4d96-b6e7-249367a0004a.jpg'],
  ['hero_lake_nakuru',      'Lake Nakuru',                 'heroes', '/uploads/85a96d0c-3947-4903-b593-89e55d3e411f.jpg'],
  ['hero_lamu',             'Lamu Island',                 'heroes', '/uploads/c727e0d3-8046-4aa8-a394-5c8cd051f6e9.jpg'],
].forEach(([key, label, page, url]) =>
  db.run('INSERT OR IGNORE INTO site_images (key, label, page, url) VALUES (?, ?, ?, ?)', [key, label, page, url || null])
);
saveDB();

// ── Image Upload ──

app.post('/api/admin/upload', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/upload/:filename', authMiddleware, (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // sanitize
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Site Images API ──

app.get('/api/site-images', (req, res) => {
  try {
    const rows = rowsAll('SELECT key, url FROM site_images');
    const map = {};
    rows.forEach(r => { map[r.key] = r.url || null; });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/site-images', authMiddleware, (req, res) => {
  try { res.json(rowsAll('SELECT * FROM site_images ORDER BY page, key')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/site-images/:key', authMiddleware, (req, res) => {
  try {
    const { url } = req.body;
    const existing = rowGet('SELECT key FROM site_images WHERE key = ?', [req.params.key]);
    if (!existing) return res.status(404).json({ error: 'Image key not found' });
    db.run('UPDATE site_images SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [url || null, req.params.key]);
    saveDB();
    res.json({ message: 'Site image updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Auth ──

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = rowGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = rowGet('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

// ── Packages (public) ──

app.get('/api/packages', (req, res) => {
  try {
    const featured = req.query.featured;
    const category = req.query.category;
    let sql = 'SELECT * FROM packages WHERE active = 1';
    const params = [];
    if (featured === '1') { sql += ' AND featured = 1'; }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY featured DESC, rating DESC, created_at DESC';
    const packages = rowsAll(sql, params);
    packages.forEach(p => { try { p.highlights = JSON.parse(p.highlights); } catch { p.highlights = []; } });
    res.json(packages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/packages/:slug', (req, res) => {
  try {
    const pkg = rowGet('SELECT * FROM packages WHERE slug = ? AND active = 1', [req.params.slug]);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    try { pkg.highlights = JSON.parse(pkg.highlights); } catch { pkg.highlights = []; }
    if (pkg.itinerary) try { pkg.itinerary = JSON.parse(pkg.itinerary); } catch {}
    if (pkg.included) try { pkg.included = JSON.parse(pkg.included); } catch {}
    if (pkg.excluded) try { pkg.excluded = JSON.parse(pkg.excluded); } catch {}
    res.json(pkg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Destinations (public) ──

app.get('/api/destinations', (req, res) => {
  try {
    const featured = req.query.featured;
    let sql = 'SELECT id, name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng, featured FROM destinations WHERE active = 1';
    const params = [];
    if (featured === '1') { sql += ' AND featured = 1'; }
    sql += ' ORDER BY featured DESC, name ASC';
    const dests = rowsAll(sql, params);
    dests.forEach(d => { if (d.highlights) try { d.highlights = JSON.parse(d.highlights); } catch {} });
    res.json(dests);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/destinations/:slug', (req, res) => {
  try {
    const dest = rowGet('SELECT * FROM destinations WHERE slug = ? AND active = 1', [req.params.slug]);
    if (!dest) return res.status(404).json({ error: 'Destination not found' });
    if (dest.highlights) try { dest.highlights = JSON.parse(dest.highlights); } catch {}
    res.json(dest);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Testimonials (public) ──

app.get('/api/testimonials', (req, res) => {
  try {
    const featured = req.query.featured;
    let sql = 'SELECT * FROM testimonials WHERE active = 1';
    if (featured === '1') sql += ' AND featured = 1';
    sql += ' ORDER BY featured DESC, created_at DESC';
    res.json(rowsAll(sql));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Inquiries (public submit, admin list) ──

app.post('/api/inquiries', (req, res) => {
  try {
    const { name, email, phone, travelers, travel_date_start, travel_date_end, budget_range, package_id, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const result = dbRun(
      'INSERT INTO inquiries (name, email, phone, travelers, travel_date_start, travel_date_end, budget_range, package_id, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, travelers || null, travel_date_start || null, travel_date_end || null, budget_range || null, package_id || null, message || null]
    );
    saveDB();
    res.status(201).json({ message: 'Inquiry submitted successfully', id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/inquiries', authMiddleware, (req, res) => {
  try {
    const sort = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
    const inquiries = rowsAll(`SELECT i.*, p.title as package_title FROM inquiries i LEFT JOIN packages p ON i.package_id = p.id ORDER BY i.created_at ${sort}`);
    res.json(inquiries);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/inquiries/:id', authMiddleware, (req, res) => {
  try {
    const { status, notes } = req.body;
    const existing = rowGet('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Inquiry not found' });
    db.run('UPDATE inquiries SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?',
      [status || null, notes !== undefined ? notes : null, req.params.id]);
    saveDB();
    res.json({ message: 'Inquiry updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/inquiries/:id', authMiddleware, (req, res) => {
  try {
    db.run('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ message: 'Inquiry deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Newsletter ──

app.post('/api/newsletter', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const existing = rowGet('SELECT * FROM newsletters WHERE email = ?', [email]);
    if (existing) return res.json({ message: 'Already subscribed!' });
    db.run('INSERT INTO newsletters (email, name) VALUES (?, ?)', [email, name || null]);
    saveDB();
    res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/newsletters', authMiddleware, (req, res) => {
  try { res.json(rowsAll('SELECT * FROM newsletters ORDER BY created_at DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin CRUD: Packages ──

app.get('/api/admin/packages', authMiddleware, (req, res) => {
  try {
    const packages = rowsAll('SELECT * FROM packages ORDER BY created_at DESC');
    packages.forEach(p => { try { p.highlights = JSON.parse(p.highlights); } catch { p.highlights = []; } });
    res.json(packages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/packages', authMiddleware, (req, res) => {
  try {
    const { title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights, image_url, badge, featured } = req.body;
    if (!title || !slug || !duration || !price) return res.status(400).json({ error: 'Title, slug, duration, and price are required' });
    const result = dbRun(
      'INSERT INTO packages (title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights, image_url, badge, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, category || 'safari', duration, nights || null, price, price_label || '/ person', rating || 4.8, review_count || 0, description || '', JSON.stringify(highlights || []), image_url || null, badge || null, featured ? 1 : 0]
    );
    saveDB();
    res.status(201).json({ message: 'Package created', id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/packages/:id', authMiddleware, (req, res) => {
  try {
    const existing = rowGet('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Package not found' });
    const { title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights, image_url, badge, featured, active } = req.body;
    db.run(
      'UPDATE packages SET title=COALESCE(?,title), slug=COALESCE(?,slug), category=COALESCE(?,category), duration=COALESCE(?,duration), nights=COALESCE(?,nights), price=COALESCE(?,price), price_label=COALESCE(?,price_label), rating=COALESCE(?,rating), review_count=COALESCE(?,review_count), description=COALESCE(?,description), highlights=?, image_url=COALESCE(?,image_url), badge=?, featured=COALESCE(?,featured), active=COALESCE(?,active), updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [title, slug, category, duration, nights, price, price_label, rating, review_count, description, highlights ? JSON.stringify(highlights) : existing.highlights, image_url, badge !== undefined ? badge : existing.badge, featured, active, req.params.id]
    );
    saveDB();
    res.json({ message: 'Package updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/packages/:id', authMiddleware, (req, res) => {
  try {
    db.run('DELETE FROM packages WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ message: 'Package deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin CRUD: Destinations ──

app.get('/api/admin/destinations', authMiddleware, (req, res) => {
  try { res.json(rowsAll('SELECT * FROM destinations ORDER BY created_at DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/destinations', authMiddleware, (req, res) => {
  try {
    const { name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
    const result = dbRun(
      'INSERT INTO destinations (name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, region || null, description || '', short_desc || null, image_url || null, hero_image_url || null, JSON.stringify(highlights || []), best_time || null, lat || null, lng || null]
    );
    saveDB();
    res.status(201).json({ message: 'Destination created', id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/destinations/:id', authMiddleware, (req, res) => {
  try {
    const existing = rowGet('SELECT * FROM destinations WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Destination not found' });
    const { name, slug, region, description, short_desc, image_url, hero_image_url, highlights, best_time, lat, lng, active } = req.body;
    db.run(
      'UPDATE destinations SET name=COALESCE(?,name), slug=COALESCE(?,slug), region=COALESCE(?,region), description=COALESCE(?,description), short_desc=COALESCE(?,short_desc), image_url=COALESCE(?,image_url), hero_image_url=COALESCE(?,hero_image_url), highlights=?, best_time=COALESCE(?,best_time), lat=COALESCE(?,lat), lng=COALESCE(?,lng), active=COALESCE(?,active), updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, slug, region, description, short_desc, image_url, hero_image_url, highlights ? JSON.stringify(highlights) : existing.highlights, best_time, lat, lng, active, req.params.id]
    );
    saveDB();
    res.json({ message: 'Destination updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/destinations/:id', authMiddleware, (req, res) => {
  try {
    db.run('DELETE FROM destinations WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ message: 'Destination deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin CRUD: Testimonials ──

app.get('/api/admin/testimonials', authMiddleware, (req, res) => {
  try { res.json(rowsAll('SELECT * FROM testimonials ORDER BY created_at DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/testimonials', authMiddleware, (req, res) => {
  try {
    const { name, location, avatar_url, rating, text, featured } = req.body;
    if (!name || !text) return res.status(400).json({ error: 'Name and text are required' });
    const result = dbRun('INSERT INTO testimonials (name, location, avatar_url, rating, text, featured) VALUES (?, ?, ?, ?, ?, ?)',
      [name, location || null, avatar_url || null, rating || 5, text, featured ? 1 : 0]);
    saveDB();
    res.status(201).json({ message: 'Testimonial created', id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/testimonials/:id', authMiddleware, (req, res) => {
  try {
    const existing = rowGet('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Testimonial not found' });
    const { name, location, avatar_url, rating, text, featured, active } = req.body;
    db.run('UPDATE testimonials SET name=COALESCE(?,name), location=COALESCE(?,location), avatar_url=COALESCE(?,avatar_url), rating=COALESCE(?,rating), text=COALESCE(?,text), featured=COALESCE(?,featured), active=COALESCE(?,active) WHERE id=?',
      [name, location, avatar_url, rating, text, featured, active, req.params.id]);
    saveDB();
    res.json({ message: 'Testimonial updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/testimonials/:id', authMiddleware, (req, res) => {
  try {
    db.run('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ message: 'Testimonial deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard stats ──

app.get('/api/admin/stats', authMiddleware, (req, res) => {
  try {
    const stats = {
      total_packages: rowGet('SELECT COUNT(*) as c FROM packages').c,
      active_packages: rowGet('SELECT COUNT(*) as c FROM packages WHERE active = 1').c,
      total_destinations: rowGet('SELECT COUNT(*) as c FROM destinations').c,
      total_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries').c,
      new_inquiries: rowGet('SELECT COUNT(*) as c FROM inquiries WHERE status = ?', ['new']).c,
      total_subscribers: rowGet('SELECT COUNT(*) as c FROM newsletters').c,
      total_testimonials: rowGet('SELECT COUNT(*) as c FROM testimonials').c,
      recent_inquiries: rowsAll('SELECT i.*, p.title as package_title FROM inquiries i LEFT JOIN packages p ON i.package_id = p.id ORDER BY i.created_at DESC LIMIT 5')
    };
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin HTML dashboard ──

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  const filePath = path.join(__dirname, 'admin', req.params[0]);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ── SPA fallback ──

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(publicDir, req.path);
  if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) return res.sendFile(filePath);
  res.sendFile(path.join(publicDir, 'index.html'));
});

}).then(() => {
  app.listen(PORT, () => {
    console.log(`Kiboko Adventures backend running at http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
