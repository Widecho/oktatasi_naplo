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

// GET /naplo/honap/:ev/:honap paraméterezéssel szintén le kellene kezelni a műszakot, de főleg a general /naplo lesz a mérvadó a frontend filterezésnél. Ezt is patcheljük.
router.get('/naplo/honap/:ev/:honap', auth, (req, res) => {
  res.status(400).json({ error: 'Elavult végpont. A /naplo -t használd frontend szűréssel.' });
});

// POST /naplo – új bejegyzés mentése
router.post('/naplo', auth, (req, res) => {
  const { date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id } = req.body;
  const user_id = req.user.id;
  const role = req.user.role;
  let shift = req.user.shift; // By default, use the user's token shift

  // Ha admin, akkor a frontendről jön a kiválasztott shift
  if (role === 'admin') {
    shift = req.body.shift;
    if (!shift) return res.status(400).json({ error: 'Műszak megadása kötelező az adminnak is.' });
  }

  if (!date || !hour_id || !duration_id || !topic_id || !outline_id || !instructor_id || !education_type_id || !shift) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  const sql = `
    INSERT INTO naplo_entries 
    (date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id, shift)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id, shift];

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
  const role = req.user.role;
  let shift = req.user.shift;

  if (role === 'admin') {
    shift = req.body.shift;
    if (!shift) return res.status(400).json({ error: 'Műszak megadása kötelező az adminnak is.' });
  }

  if (!date || !hour_id || !duration_id || !topic_id || !outline_id || !instructor_id || !education_type_id || !shift) {
    return res.status(400).json({ error: 'Hiányzó mezők a kérésben.' });
  }

  const sql = `
    UPDATE naplo_entries
    SET date = ?, hour_id = ?, duration_id = ?, topic_id = ?, outline_id = ?, instructor_id = ?, education_type_id = ?, user_id = ?, shift = ?
    WHERE id = ?
  `;

  const params = [date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id, shift, entryId];

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
  const role = req.user.role;
  const shift = req.user.shift;

  // Let the user filter by 'kombinált' naturally on frontend if they like, but the backend restricts data:
  let shiftCondition = '';
  let params = [];

  if (role !== 'admin' && shift) {
    // A regular user only sees their own shift
    shiftCondition = "WHERE n.shift = ?";
    params.push(shift);
  }

  const sql = `
    SELECT n.id, n.date, n.shift,
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
    ${shiftCondition}
    ORDER BY n.date ASC, n.id ASC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Hiba a naplóbejegyzések lekérdezésekor.', details: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;