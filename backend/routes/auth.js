const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT titkos kulcs .env-ből
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Adatbázis hiba.' });
    if (!user) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token });
  });
});

module.exports = router;
