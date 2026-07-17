const initSqlJs = require('../backend/node_modules/sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const p = path.join(__dirname, '..', 'backend', 'data', 'discover-kenya.db');
  const db = new SQL.Database(fs.readFileSync(p));
  db.run(
    'UPDATE site_images SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
    ['/IMAGES/Classic%20mara/classic%20mara.jpg', 'hero_packages']
  );
  fs.writeFileSync(p, Buffer.from(db.export()));
  const row = db.exec("SELECT url FROM site_images WHERE key = 'hero_packages'");
  console.log('hero_packages =', row[0].values[0][0]);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
