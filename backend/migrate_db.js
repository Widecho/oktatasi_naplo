const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../oktatasi_naplo.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Hiba az adatbázis megnyitásakor:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS education_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  const defaultTypes = ['Időszakos oktatás', 'Új operátoroknak', 'Régi operátoroknak'];
  defaultTypes.forEach(type => {
    db.run(
      'INSERT INTO education_types (name) SELECT ? WHERE NOT EXISTS(SELECT 1 FROM education_types WHERE name = ?)',
      [type, type]
    );
  });

  db.all('PRAGMA table_info(naplo_entries)', (err, columns) => {
    if (err) return console.error('Hiba a tábla adatainak lekérdezésekor:', err);

    const hasColumn = columns.some(col => col.name === 'education_type_id');
    if (!hasColumn) {
      db.run('ALTER TABLE naplo_entries ADD COLUMN education_type_id INTEGER REFERENCES education_types(id) DEFAULT 1', (alterErr) => {
        if (alterErr) console.error('Hiba a tábla módosításakor:', alterErr);
        else console.log('education_type_id oszlop hozzáadva a naplo_entries táblához.');
      });
    } else {
      console.log('Az education_type_id oszlop már létezik.');
    }
  });
});
