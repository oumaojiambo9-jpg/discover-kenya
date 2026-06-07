const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function initDB() {
  const SQL = await initSqlJs();
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'discover-kenya.db');
  const db = new SQL.Database();
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
    db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', ['admin', 'admin@discoverkenya.com', hash, 'admin']);
    console.log('Default admin user created (admin / admin123)');
  }

  const pkgStmt = db.prepare('SELECT COUNT(*) as c FROM packages');
  pkgStmt.step();
  const pkgCount = pkgStmt.getAsObject().c;
  pkgStmt.free();
  if (pkgCount === 0) {
    const pkgs = [
      ['Classic Mara Safari', 'classic-mara-safari', 'safari', '7 Days', '6 Nights', 2450, 4.9, 128,
        'Witness the Great Migration, visit Maasai villages, enjoy game drives, and end with a hot air balloon safari over the Mara.',
        '["Full-board accommodation","Daily game drives","Park fees included","Airport transfers"]',
        null, 'Best Seller', 1],
      ['Safari & Beach Combo', 'safari-beach-combo', 'combo', '10 Days', '9 Nights', 3280, 4.8, 94,
        'Combine the thrill of a 5-day safari with 5 days of pure beach bliss on the pristine white sands of Diani Beach.',
        '["5 days safari + 5 days beach","All flights & transfers","Snorkeling & dhow cruise","Half-board beach resort"]',
        null, 'Popular', 1],
      ['Cultural Heritage Trail', 'cultural-heritage-trail', 'culture', '5 Days', '4 Nights', 1890, 4.7, 63,
        'Immerse yourself in Kenya\'s rich cultures — visit Maasai, Samburu, and Swahili communities, explore museums and historic sites.',
        '["Guided village visits","Cultural performances","Local cuisine experiences","Nairobi city tour"]',
        null, null, 1],
      ['Mount Kenya Trekking Expedition', 'mount-kenya-trekking', 'adventure', '8 Days', '7 Nights', 2150, 4.9, 47,
        'Conquer Africa\'s second-highest peak via the scenic Sirimon route. Expert guides, quality gear, and stunning alpine scenery.',
        '["Professional mountain guides","All camping equipment","Meals & porters included","Summit certificate"]',
        null, null, 1],
      ['Ultimate Luxury Safari', 'ultimate-luxury-safari', 'luxury', '12 Days', '11 Nights', 8900, 5.0, 34,
        'Experience Kenya at its finest — private charters, award-winning lodges, champagne sunsets, and exclusive wildlife encounters.',
        '["Private safari vehicle","Luxury all-inclusive lodges","Private guide & chef","Spa & wellness included"]',
        null, 'Luxury', 1],
      ['Family Adventure Safari', 'family-adventure-safari', 'family', '9 Days', '8 Nights', 3450, 4.8, 72,
        'A family-friendly journey with kid-friendly lodges, educational game drives, beach time, and cultural activities for all ages.',
        '["Family-friendly lodges","Kids\' safari program","Child discounts available","Beach & pool time"]',
        null, 'Family', 1]
    ];
    const insertPkg = db.prepare(
      'INSERT INTO packages (title, slug, category, duration, nights, price, rating, review_count, description, highlights, image_url, badge, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const p of pkgs) { insertPkg.bind(p); insertPkg.step(); insertPkg.reset(); }
    insertPkg.free();
    console.log('Packages seeded');
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
  if (testCount === 0) {
    const insertTest = db.prepare('INSERT INTO testimonials (name, location, rating, text, featured) VALUES (?, ?, ?, ?, ?)');
    insertTest.bind(['Sarah Mitchell', 'London, UK', 5, 'An absolutely life-changing experience. Watching the Great Migration from a hot air balloon at sunrise is something I will never forget. Kenya exceeded every expectation.', 1]); insertTest.step(); insertTest.reset();
    insertTest.bind(['James Walker', 'New York, USA', 5, 'From the Maasai Mara to Diani Beach, every moment was magical. The Kenyan people are the warmest I\'ve ever met. Hakuna Matata is a way of life here!', 1]); insertTest.step(); insertTest.reset();
    insertTest.bind(['Emma Chen', 'Beijing, China', 5, 'Climbing Mount Kenya was the challenge of a lifetime, and the coastal relaxation in Watamu was pure bliss. Kenya offers adventure and serenity in one incredible package.', 1]); insertTest.step(); insertTest.reset();
    insertTest.free();
    console.log('Testimonials seeded');
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  db.close();
  console.log('Database initialized successfully!');
}

initDB().catch(console.error);
