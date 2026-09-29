const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../oktatasi_naplo.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Hiba az adatbázis megnyitásakor:', err.message);
  } else {
    console.log('Csatlakozva az SQLite adatbázishoz.');
  }
});

db.ready = new Promise((resolve, reject) => {
  db.all('PRAGMA table_info(naplo_entries)', (err, columns) => {
    if (err) return reject(err);

    if (columns.some(column => column.name === 'note')) {
      return resolve();
    }

    db.run('ALTER TABLE naplo_entries ADD COLUMN note TEXT', (alterErr) => {
      if (alterErr) reject(alterErr);
      else {
        console.log('Megjegyzés oszlop hozzáadva a naplo_entries táblához.');
        resolve();
      }
    });
  });
});

module.exports = db;
