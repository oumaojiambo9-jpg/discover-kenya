const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function initDB() {
  const SQL = await initSqlJs();
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'discover-kenya.db');
  let db = new SQL.Database();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  }

  db.run('PRAGMA foreign_keys = ON');

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'safari',
      duration TEXT NOT NULL,
      nights TEXT,
      price REAL NOT NULL,
      price_label TEXT DEFAULT '/ person',
      rating REAL DEFAULT 4.8,
      review_count INTEGER DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      highlights TEXT NOT NULL DEFAULT '[]',
      image_url TEXT,
      badge TEXT,
      itinerary TEXT,
      included TEXT,
      excluded TEXT,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      region TEXT,
      description TEXT NOT NULL DEFAULT '',
      short_desc TEXT,
      image_url TEXT,
      hero_image_url TEXT,
      highlights TEXT,
      best_time TEXT,
      getting_there TEXT,
      wildlife TEXT,
      culture TEXT,
      activities TEXT,
      lat REAL,
      lng REAL,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      travelers INTEGER,
      travel_date_start TEXT,
      travel_date_end TEXT,
      budget_range TEXT,
      package_id INTEGER,
      message TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      avatar_url TEXT,
      rating INTEGER DEFAULT 5,
      text TEXT NOT NULL,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;
  db.run(schema);

  const stmt = db.prepare('SELECT COUNT(*) as c FROM users');
  stmt.step();
  const userCount = stmt.getAsObject().c;
  stmt.free();
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', ['admin', 'admin@kibokoadventures.com', hash, 'admin']);
    console.log('Default admin user created (admin / admin123)');
  }

  const forceReseed = process.argv.includes('--reseed');
  const pkgStmt = db.prepare('SELECT COUNT(*) as c FROM packages');
  pkgStmt.step();
  const pkgCount = pkgStmt.getAsObject().c;
  pkgStmt.free();
  if (pkgCount === 0 || forceReseed) {
    if (forceReseed) {
      db.run('DELETE FROM packages');
      console.log('Cleared existing packages for reseed');
    }
    const pkgs = [
      ['Mt Kenya Trek & Ol Pejeta Safari', 'mt-kenya-ol-pejeta-5day', 'adventure', '5 Days', '4 Nights', 2450, 4.9, 128,
        'Summit Point Lenana on Mt Kenya (4,985m), then track the Big Five and endangered rhinos at Ol Pejeta Conservancy — our signature Meru-based itinerary.',
        '["Point Lenana summit attempt","Ol Pejeta Big Five game drives","Professional mountain guides","Community-benefit lodges"]',
        '/IMAGES/Mount%20Kenya/mount%20kenya.png.jpg', 'Signature', 1],
      ['Laikipia Conservancy Escape', 'laikipia-conservancy-4day', 'safari', '4 Days', '3 Nights', 1890, 4.8, 86,
        'Four intimate days tracking lions, elephants, and Grevy\'s zebra across private Laikipia conservancies — small groups, no mass tourism.',
        '["Private conservancy access","Daily game drives","Local Meru guides","Full-board bush camps"]',
        '/IMAGES/Lion/lion.png.jpg', 'Best Seller', 1],
      ['Solio & Ol Pejeta Rhino Trail', 'solio-ol-pejeta-4day', 'safari', '4 Days', '3 Nights', 1750, 4.9, 72,
        'A focused rhino and wildlife safari linking Solio Ranch and Ol Pejeta — Africa\'s strongest black and white rhino sanctuaries.',
        '["Solio Ranch rhinos","Ol Pejeta conservancy","Chimpanzee sanctuary visit","Airport transfers from Meru/Nanyuki"]',
        '/IMAGES/Elelphant/elephant.png.jpg', 'Popular', 1],
      ['Mt Kenya Point Lenana Summit', 'mt-kenya-lenana-5day', 'adventure', '5 Days', '4 Nights', 2150, 4.9, 94,
        'Conquer Point Lenana via the scenic Sirimon route with expert local guides, quality gear, and alpine scenery few operators match.',
        '["Sirimon route trek","Summit certificate","Meals & porters included","All camping equipment"]',
        '/IMAGES/Mount%20Kenya/mt%20kenya.png.jpg', 'Adventure', 1],
      ['Northern Kenya from Meru', 'northern-kenya-meru-7day', 'safari', '7 Days', '6 Nights', 3280, 4.8, 61,
        'Go beyond the beaten path from our Meru base: reticulated giraffe, Grevy\'s zebra, Samburu culture, and remote northern landscapes.',
        '["Meru National Park","Samburu / northern specials","Cultural village visit","Full-board lodges & camps"]',
        '/IMAGES/Maasai/huts.png.jpg', 'Off the Path', 1],
      ['Private Luxury Conservancy Safari', 'luxury-conservancy-custom', 'luxury', '8 Days', '7 Nights', 5900, 5.0, 34,
        'A fully private Laikipia & Mt Kenya journey — exclusive camps, private vehicle and guide, and tailor-made pacing for couples or small groups.',
        '["Private safari vehicle & guide","Luxury conservancy lodges","Flexible daily itinerary","Spa & exclusive experiences"]',
        '/IMAGES/Luxury/luxury.png.jpg', 'Luxury', 1]
    ];
    const insertPkg = db.prepare(
      'INSERT INTO packages (title, slug, category, duration, nights, price, rating, review_count, description, highlights, image_url, badge, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const p of pkgs) { insertPkg.bind(p); insertPkg.step(); insertPkg.reset(); }
    insertPkg.free();
    console.log('Packages seeded (Kiboko signature itineraries)');
  }

  const destStmt = db.prepare('SELECT COUNT(*) as c FROM destinations');
  destStmt.step();
  const destCount = destStmt.getAsObject().c;
  destStmt.free();
  if (destCount === 0) {
    const dests = [
      ['Maasai Mara', 'maasai-mara', 'Southern', 'Experience the Maasai Mara — Africa\'s most iconic wildlife reserve. Witness the Great Migration, the Big Five, and authentic Maasai culture.', 'Home of the Great Migration', '["Great Migration (Jul-Oct)","Big Five wildlife","Maasai cultural visits","Hot air balloon safaris"]', 1],
      ['Amboseli', 'amboseli', 'Southern', 'Explore Amboseli National Park — home to large elephant herds and stunning views of Mount Kilimanjaro.', 'Elephants against Kilimanjaro', '["Large elephant herds","Mt Kilimanjaro views","Excellent birding","Photography paradise"]', 1],
      ['Nairobi', 'nairobi', 'Nairobi & Environs', 'Discover Nairobi — Kenya\'s vibrant capital. From Nairobi National Park to world-class restaurants, explore the city where urban meets wild.', 'The safari capital', '["Nairobi National Park","Karen Blixen Museum","Giraffe Centre","Vibrant dining scene"]', 1],
      ['Diani Beach', 'diani-beach', 'Coast', 'Escape to Diani Beach — pristine white sands, crystal-clear waters, and world-class resorts on Kenya\'s south coast.', 'Kenya\'s coastal gem', '["White sand beaches","Snorkeling & diving","Dhow cruises","Beachfront resorts"]', 1],
      ['Mount Kenya', 'mount-kenya', 'Central Highlands', 'Climb Mount Kenya — a UNESCO World Heritage site with trekking routes, alpine scenery, and unique wildlife.', 'Africa\'s second-highest peak', '["Trekking routes","Alpine scenery","Unique wildlife","UNESCO World Heritage site"]', 1],
      ['Lake Nakuru', 'lake-nakuru', 'Rift Valley', 'Visit Lake Nakuru National Park — famous for flamingos, rhinos, and breathtaking Rift Valley scenery.', 'Flamingos & rhinos', '["Flamingo populations","Rhino sanctuary","Rift Valley scenery","Bird watching"]', 1],
      ['Lamu Island', 'lamu', 'Coast', 'Explore Lamu Island — a UNESCO World Heritage site with Swahili culture, ancient architecture, and pristine beaches.', 'Timeless Swahili shores', '["UNESCO Old Town","Swahili architecture","Dhow safaris","Pristine beaches"]', 1]
    ];
    const insertDest = db.prepare(
      'INSERT INTO destinations (name, slug, region, description, short_desc, highlights, featured) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const d of dests) { insertDest.bind(d); insertDest.step(); insertDest.reset(); }
    insertDest.free();
    console.log('Destinations seeded');
  }

  const testStmt = db.prepare('SELECT COUNT(*) as c FROM testimonials');
  testStmt.step();
  const testCount = testStmt.getAsObject().c;
  testStmt.free();
  if (testCount === 0 || forceReseed) {
    if (forceReseed) db.run('DELETE FROM testimonials');
    const insertTest = db.prepare('INSERT INTO testimonials (name, location, rating, text, featured) VALUES (?, ?, ?, ?, ?)');
    insertTest.bind(['Sarah H.', 'London, UK', 5, 'We summited Point Lenana at sunrise and by evening we were watching a lion pride at Ol Pejeta. The most extraordinary 5 days of my life — the guides\' knowledge of the land is unmatched.', 1]); insertTest.step(); insertTest.reset();
    insertTest.bind(['Amara K.', 'Nairobi, Kenya', 5, 'The northern Kenya safari from Meru is genuinely off the beaten path — reticulated giraffe, Grevy\'s zebra, and a leopard at the river. As a solo traveller Kiboko ticked every box.', 1]); insertTest.step(); insertTest.reset();
    insertTest.bind(['James W.', 'New York, USA', 5, 'Laikipia conservancy stays felt exclusive and wild. Small groups, real community benefit, and guides who grew up on this land. We will be back for Mt Kenya.', 1]); insertTest.step(); insertTest.reset();
    insertTest.free();
    console.log('Testimonials seeded (Kiboko guest stories)');
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  db.close();
  console.log('Database initialized successfully!');
}

initDB().catch(console.error);
