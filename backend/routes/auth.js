const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT titkos kulcs .env-ből
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Regisztráció
router.post('/register', async (req, res) => {
  const { username, password, secretCode, shift } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Minden mező kitöltése kötelező.' });
  }

  if (!/\d/.test(password)) {
    return res.status(400).json({ error: 'A jelszónak tartalmaznia kell legalább egy számot!' });
  }

  const role = (secretCode === 'cicakutya') ? 'admin' : 'user';

  // Normal users must have a shift
  if (role === 'user' && !shift) {
    return res.status(400).json({ error: 'Beosztott regisztrációhoz műszak választása kötelező.' });
  }

  const userShift = (role === 'admin') ? null : shift;

  try {
    // Ellenőrizzük, hogy létezik-e már a felhasználó
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: 'A felhasználónév már foglalt.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password_hash, role, shift, must_change_password) VALUES (?, ?, ?, ?, 0)',
      [username, hashedPassword, role, userShift],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Hiba a regisztráció során.' });
        }
        res.status(201).json({ message: 'Sikeres regisztráció!' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Adatbázis hiba.' });
    if (!user) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, shift: user.shift },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, mustChangePassword: user.must_change_password === 1 });
  });
});

// Jelszó módosítása (reset után)
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.id;

  if (!newPassword || !/\d/.test(newPassword)) {
    return res.status(400).json({ error: 'Az új jelszónak tartalmaznia kell legalább egy számot!' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  db.run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [hashedPassword, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Hiba a jelszó frissítésekor.' });
      res.json({ message: 'Jelszó sikeresen frissítve.' });
    }
  );
});

module.exports = router;
