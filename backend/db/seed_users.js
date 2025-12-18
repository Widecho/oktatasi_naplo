const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../../oktatasi_naplo.db'));

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' }
];

users.forEach(async ({ username, password, role }) => {
  const hash = await bcrypt.hash(password, 10);
  db.run(
    'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, hash, role],
    (err) => {
      if (err) {
        console.error(`Hiba a ${username} hozzáadásakor:`, err.message);
      } else {
        console.log(`${username} létrehozva.`);
      }
    }
  );
});
