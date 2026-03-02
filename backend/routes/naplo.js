const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

router.get('/dropdowns', (req, res) => {
  const queries = {
    hours: 'SELECT * FROM hours',
    durations: 'SELECT * FROM durations',
    instructors: 'SELECT * FROM instructors',
    topics: 'SELECT * FROM topics',
    outlines: 'SELECT * FROM outlines',
    education_types: 'SELECT * FROM education_types'
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  for (const [key, sql] of Object.entries(queries)) {
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: `Hiba a(z) ${key} lekérdezése közben`, details: err.message });
      }
      results[key] = rows;
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  }
});

// GET /dropdowns – Összes legördülő mező tartalma
router.get('/naplo/honap/:ev/:honap', auth, (req, res) => {
  const { ev, honap } = req.params;
  const fromDate = `${ev}-${honap.padStart(2, '0')}-01`;
  const toDate = `${ev}-${honap.padStart(2, '0')}-31`; // egyszerűsített határ

  const sql = `
    SELECT e.*, 
           h.name AS hour, d.value AS duration,
           i.name AS instructor, t.name AS topic,
           o.content AS outline, u.username AS user,
           et.name AS education_type
    FROM naplo_entries e
    JOIN hours h ON h.id = e.hour_id
    JOIN durations d ON d.id = e.duration_id
    JOIN instructors i ON i.id = e.instructor_id
    JOIN topics t ON t.id = e.topic_id
    JOIN outlines o ON o.id = e.outline_id
    JOIN users u ON u.id = e.user_id
    JOIN education_types et ON et.id = e.education_type_id
    WHERE e.date BETWEEN ? AND ?
    ORDER BY e.date ASC, h.id ASC
  `;

  db.all(sql, [fromDate, toDate], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Hiba a lekérdezéskor.', details: err.message });
    }
    res.json(rows);
  });
});

// POST /naplo – új bejegyzés mentése
router.post('/naplo', auth, (req, res) => {
  const { date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id } = req.body;
  const user_id = req.user.id; // 🔐 már nem jön a body-ból!

  if (!date || !hour_id || !duration_id || !topic_id || !outline_id || !instructor_id || !education_type_id) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  const sql = `
    INSERT INTO naplo_entries 
    (date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a bejegyzés mentésekor.', details: err.message });
    }
    res.status(201).json({ message: 'Bejegyzés sikeresen létrehozva.', entryId: this.lastID });
  });
});

// PUT /naplo/:id – meglévő bejegyzés szerkesztése
router.put('/naplo/:id', auth, (req, res) => {
  const entryId = req.params.id;
  const { date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id } = req.body;
  const user_id = req.user.id;

  if (!date || !hour_id || !duration_id || !topic_id || !outline_id || !instructor_id || !education_type_id) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  const sql = `
    UPDATE naplo_entries
    SET date = ?, hour_id = ?, duration_id = ?, topic_id = ?, outline_id = ?, instructor_id = ?, education_type_id = ?, user_id = ?
    WHERE id = ?
  `;

  const params = [date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id, entryId];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a bejegyzés frissítésekor.', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen ID-jű bejegyzés.' });
    }
    res.json({ message: 'Bejegyzés sikeresen frissítve.' });
  });
});

router.get('/admin-only', auth, adminOnly, (req, res) => {
  res.json({ message: 'Üdvözlünk, admin!' });
});



// DELETE /naplo/:id – bejegyzés törlése
router.delete('/naplo/:id', auth, (req, res) => {
  const entryId = req.params.id;

  const sql = 'DELETE FROM naplo_entries WHERE id = ?';
  db.run(sql, [entryId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Hiba a törlés során.', details: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nincs ilyen ID-jű bejegyzés.' });
    }

    res.json({ message: 'Bejegyzés sikeresen törölve.' });
  });
});

router.get('/naplo', auth, (req, res) => {
  const sql = `
    SELECT n.id, n.date,
           h.name AS hour,
           d.value AS duration,
           t.name AS topic,
           o.content AS outline,
           i.name AS instructor,
           u.username AS user,
           et.name AS education_type
    FROM naplo_entries n
    JOIN hours h ON n.hour_id = h.id
    JOIN durations d ON n.duration_id = d.id
    JOIN topics t ON n.topic_id = t.id
    JOIN outlines o ON n.outline_id = o.id
    JOIN instructors i ON n.instructor_id = i.id
    JOIN users u ON n.user_id = u.id
    JOIN education_types et ON et.id = n.education_type_id
    ORDER BY n.date ASC, n.id ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Hiba a naplóbejegyzések lekérdezésekor.', details: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;