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
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) return console.error(err);

    if (!columns.some(col => col.name === 'shift')) {
      db.run('ALTER TABLE users ADD COLUMN shift TEXT', alterErr => {
        if (alterErr) console.error('Hiba a shift oszlop hozzáadásakor a users táblához:', alterErr.message);
        else console.log('shift oszlop hozzáadva a users táblához.');
      });
    }

    if (!columns.some(col => col.name === 'must_change_password')) {
      db.run('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0', alterErr => {
        if (alterErr) console.error('Hiba a must_change_password oszlop hozzáadásakor:', alterErr.message);
        else console.log('must_change_password oszlop hozzáadva a users táblához.');
      });
    }
  });

  db.all('PRAGMA table_info(naplo_entries)', (err, columns) => {
    if (err) return console.error(err);

    if (!columns.some(col => col.name === 'shift')) {
      db.run('ALTER TABLE naplo_entries ADD COLUMN shift TEXT', alterErr => {
        if (alterErr) {
          console.error('Hiba a shift oszlop hozzáadásakor a naplo_entries táblához:', alterErr.message);
        } else {
          console.log('shift oszlop hozzáadva a naplo_entries táblához.');
          db.run("UPDATE naplo_entries SET shift = 'kombinált' WHERE shift IS NULL");
        }
      });
    }
  });
});
