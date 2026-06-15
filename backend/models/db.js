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

module.exports = db;
