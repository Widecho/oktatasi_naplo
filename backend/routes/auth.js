const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cicakutya';
const SHIFT_VALUES = new Set(['1', '2', '3', '4', '5']);

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 6 && /\d/.test(password);
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim() : '';
}

router.post('/register', async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password, secretCode } = req.body;
  const shift = req.body.shift ? String(req.body.shift).trim() : '';
  const role = secretCode === ADMIN_SECRET ? 'admin' : 'user';

  if (!username || !password) {
    return res.status(400).json({ error: 'Minden mező kitöltése kötelező.' });
  }

  if (!validPassword(password)) {
    return res.status(400).json({ error: 'A jelszónak legalább 6 karakterből kell állnia, és tartalmaznia kell legalább egy számot.' });
  }

  if (role === 'user' && !SHIFT_VALUES.has(shift)) {
    return res.status(400).json({ error: 'Beosztott regisztrációhoz érvényes műszak választása kötelező.' });
  }

  try {
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'A felhasználónév már foglalt.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (username, password_hash, role, shift, must_change_password) VALUES (?, ?, ?, ?, 0)',
      [username, hashedPassword, role, role === 'admin' ? null : shift]
    );

    res.status(201).json({ message: 'Sikeres regisztráció!' });
  } catch (err) {
    res.status(500).json({ error: 'Szerverhiba a regisztráció során.', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező.' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, shift: user.shift },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, mustChangePassword: user.must_change_password === 1 });
  } catch (err) {
    res.status(500).json({ error: 'Adatbázis hiba.', details: err.message });
  }
});

router.post('/change-password', auth, async (req, res) => {
  const { newPassword } = req.body;

  if (!validPassword(newPassword)) {
    return res.status(400).json({ error: 'Az új jelszónak legalább 6 karakterből kell állnia, és tartalmaznia kell legalább egy számot.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [hashedPassword, req.user.id]);
    res.json({ message: 'Jelszó sikeresen frissítve.' });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a jelszó frissítésekor.', details: err.message });
  }
});

module.exports = router;
