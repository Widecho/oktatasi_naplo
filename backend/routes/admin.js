const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// ✅ POST /admin/instructors – új oktató felvétele
router.post('/instructors', auth, adminOnly, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'A név megadása kötelező.' });
  }

  const trimmedName = name.trim();

  // Először ellenőrizzük, hogy létezik-e már
  db.get('SELECT id FROM instructors WHERE name = ?', [trimmedName], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Hiba az adatbázis lekérdezés során.', details: err.message });
    }

    if (row) {
      return res.status(409).json({ error: 'Már létezik ilyen nevű oktató.' });
    }

    // Ha nincs duplikáció, mentjük az új oktatót
    db.run('INSERT INTO instructors (name) VALUES (?)', [trimmedName], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Hiba az oktató mentésekor.', details: err.message });
      }
      res.status(201).json({ message: 'Oktató sikeresen hozzáadva.', id: this.lastID });
    });
  });
});

// ✅ POST /admin/topics – új téma felvétele
router.post('/topics', auth, adminOnly, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'A téma megadása kötelező.' });
  }

  db.run('INSERT INTO topics (name) VALUES (?)', [name.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a téma mentésekor.', details: err.message });
    }
    res.status(201).json({ message: 'Téma sikeresen hozzáadva.', id: this.lastID });
  });
});

// ✅ POST /admin/outlines – új vázlat felvétele
router.post('/outlines', auth, adminOnly, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'A vázlat szöveg megadása kötelező.' });
  }

  db.run('INSERT INTO outlines (content) VALUES (?)', [content.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a vázlat mentésekor.', details: err.message });
    }
    res.status(201).json({ message: 'Vázlat sikeresen hozzáadva.', id: this.lastID });
  });
});

// ✅ POST /admin/durations – új időtartam felvétele
router.post('/durations', auth, adminOnly, (req, res) => {
  const { value } = req.body;
  if (!value || value.trim() === '') {
    return res.status(400).json({ error: 'Az időtartam megadása kötelező.' });
  }

  db.run('INSERT INTO durations (value) VALUES (?)', [value.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba az időtartam mentésekor.', details: err.message });
    }
    res.status(201).json({ message: 'Időtartam sikeresen hozzáadva.', id: this.lastID });
  });
});

// ✅ POST /admin/education_types – új oktatási típus felvétele
router.post('/education_types', auth, adminOnly, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'A név megadása kötelező.' });
  }

  db.run('INSERT INTO education_types (name) VALUES (?)', [name.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba az oktatási típus mentésekor.', details: err.message });
    }
    res.status(201).json({ message: 'Oktatási típus sikeresen hozzáadva.', id: this.lastID });
  });
});

// 🗑️ Oktató törlése
router.delete('/instructors/:id', auth, adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM instructors WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba az oktató törlésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen oktató.' });
    }
    res.json({ message: 'Oktató sikeresen törölve.' });
  });
});

// 🗑️ Téma törlése
router.delete('/topics/:id', auth, adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM topics WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a téma törlésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen téma.' });
    }
    res.json({ message: 'Téma sikeresen törölve.' });
  });
});

// 🗑️ Vázlat törlése
router.delete('/outlines/:id', auth, adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM outlines WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a vázlat törlésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen vázlat.' });
    }
    res.json({ message: 'Vázlat sikeresen törölve.' });
  });
});

// 🗑️ Időtartam törlése
router.delete('/durations/:id', auth, adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM durations WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba az időtartam törlésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen időtartam.' });
    }
    res.json({ message: 'Időtartam sikeresen törölve.' });
  });
});

// 🗑️ Oktatási típus törlése
router.delete('/education_types/:id', auth, adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM education_types WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba az oktatási típus törlésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen oktatási típus.' });
    }
    res.json({ message: 'Oktatási típus sikeresen törölve.' });
  });
});

// --- USER MANAGEMENT ---

// Felhasználók listázása (csak a normál userek)
router.get('/users', auth, adminOnly, (req, res) => {
  db.all('SELECT id, username, role, shift, must_change_password FROM users WHERE role = "user"', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Hiba a felhasználók betöltésekor' });
    res.json(rows);
  });
});

// Felhasználó jelszavának resetelése
router.post('/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  const userId = req.params.id;
  const defaultPassword = await require('bcryptjs').hash('asd123', 10);

  db.run('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [defaultPassword, userId], function (err) {
    if (err) return res.status(500).json({ error: 'Hiba a jelszó reset során.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Felhasználó nem található.' });
    res.json({ message: 'Jelszó sikeresen visszaállítva az "asd123" értékre.' });
  });
});

// Felhasználó műszakjának frissítése
router.put('/users/:id/shift', auth, adminOnly, (req, res) => {
  const userId = req.params.id;
  const { shift } = req.body;

  if (!shift) return res.status(400).json({ error: 'A műszak megadása kötelező.' });

  db.run('UPDATE users SET shift = ? WHERE id = ?', [shift, userId], function (err) {
    if (err) return res.status(500).json({ error: 'Hiba a műszak frissítésekor.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Felhasználó nem található.' });
    res.json({ message: 'Műszak sikeresen frissítve.' });
  });
});

module.exports = router;
