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
        db.run('INSERT INTO education_types (name) SELECT ? WHERE NOT EXISTS(SELECT 1 FROM education_types WHERE name = ?)', [type, type]);
    });

    db.all("PRAGMA table_info(naplo_entries)", (err, columns) => {
        if (err) return console.error('Error getting table info:', err);

        const hasColumn = columns.some(col => col.name === 'education_type_id');
        if (!hasColumn) {
            db.run('ALTER TABLE naplo_entries ADD COLUMN education_type_id INTEGER REFERENCES education_types(id) DEFAULT 1', (err) => {
                if (err) console.error('Error altering table:', err);
                else console.log('Added education_type_id column to naplo_entries.');
            });
        } else {
            console.log('Column education_type_id already exists.');
        }
    });
});
