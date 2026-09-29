const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const SHIFT_VALUES = new Set(['1', '2', '3', '4', '5', 'kombinált']);
const DROPDOWN_QUERIES = {
  hours: 'SELECT * FROM hours ORDER BY id ASC',
  durations: 'SELECT * FROM durations ORDER BY id ASC',
  instructors: 'SELECT * FROM instructors ORDER BY name COLLATE NOCASE ASC',
  topics: 'SELECT * FROM topics ORDER BY name COLLATE NOCASE ASC',
  outlines: 'SELECT * FROM outlines ORDER BY content COLLATE NOCASE ASC',
  education_types: 'SELECT * FROM education_types ORDER BY name COLLATE NOCASE ASC'
};

db.run(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    action TEXT NOT NULL,
    user_id INTEGER,
    username TEXT,
    created_at TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT
  )
`);

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

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

function normalizeShift(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseEntryPayload(body, user) {
  const fields = {
    date: body.date,
    duration_id: Number(body.duration_id),
    topic_id: Number(body.topic_id),
    outline_id: Number(body.outline_id),
    instructor_id: Number(body.instructor_id),
    education_type_id: Number(body.education_type_id)
  };

  const missingField = Object.entries(fields).some(([, value]) => {
    if (typeof value === 'number') return !Number.isInteger(value) || value <= 0;
    return !value;
  });

  let shift = user.role === 'admin' ? normalizeShift(body.shift) : normalizeShift(user.shift);
  if (missingField || !shift) {
    return { error: 'Hiányzó vagy érvénytelen mezők a kérésben.' };
  }

  if (!SHIFT_VALUES.has(shift)) {
    return { error: 'Érvénytelen műszak.' };
  }

  return {
    values: {
      ...fields,
      note: typeof body.note === 'string' ? body.note.trim() : null,
      shift
    }
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function resolveHourId(body) {
  if (body.hour_id) {
    const hourId = Number(body.hour_id);
    if (Number.isInteger(hourId) && hourId > 0) return hourId;
  }

  const hourText = normalizeText(body.hour_text);
  if (!hourText) {
    throw new Error('Az óra megadása kötelező.');
  }

  const existing = await get('SELECT id FROM hours WHERE name = ? COLLATE NOCASE', [hourText]);
  if (existing) return existing.id;

  const result = await run('INSERT INTO hours (name) VALUES (?)', [hourText]);
  return result.lastID;
}

function userCanAccessAll(user) {
  return user.role === 'admin';
}

function restrictedEntryWhere(user, alias = 'naplo_entries') {
  if (userCanAccessAll(user)) {
    return { clause: '', params: [] };
  }

  return {
    clause: ` AND ${alias}.shift = ?`,
    params: [user.shift]
  };
}

async function getEntrySnapshot(entryId, user) {
  const access = restrictedEntryWhere(user, 'n');
  return get(`
    SELECT n.id,
           n.date,
           n.shift,
           n.hour_id,
           n.duration_id,
           n.topic_id,
           n.outline_id,
           n.instructor_id,
           n.education_type_id,
           n.note,
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
    WHERE n.id = ?${access.clause}
  `, [entryId, ...access.params]);
}

async function logAudit(action, user, entryId, before, after) {
  await run(`
    INSERT INTO audit_logs (entry_id, action, user_id, username, created_at, before_json, after_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    entryId,
    action,
    user.id,
    user.username,
    new Date().toISOString(),
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null
  ]);
}

router.get('/dropdowns', async (req, res) => {
  try {
    const results = {};
    await Promise.all(Object.entries(DROPDOWN_QUERIES).map(async ([key, sql]) => {
      results[key] = await all(sql);
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a legördülő adatok lekérdezése közben.', details: err.message });
  }
});

router.get('/naplo/honap/:ev/:honap', auth, (req, res) => {
  res.status(400).json({ error: 'Elavult végpont. Használd a /naplo végpontot szűréssel.' });
});

router.post('/naplo', auth, async (req, res) => {
  const parsed = parseEntryPayload(req.body, req.user);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const {
    date,
    duration_id,
    topic_id,
    outline_id,
    instructor_id,
    education_type_id,
    shift
  } = parsed.values;

  try {
    const hour_id = await resolveHourId(req.body);
    const result = await run(`
      INSERT INTO naplo_entries
        (date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, user_id, shift, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [date, hour_id, duration_id, topic_id, outline_id, instructor_id, education_type_id, req.user.id, shift, parsed.values.note]);

    res.status(201).json({ message: 'Bejegyzés sikeresen létrehozva.', entryId: result.lastID });
  } catch (err) {
    if (err.message === 'Az óra megadása kötelező.') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Hiba a bejegyzés mentésekor.', details: err.message });
  }
});

router.put('/naplo/:id', auth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Érvénytelen bejegyzésazonosító.' });
  }

  const parsed = parseEntryPayload(req.body, req.user);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const {
    date,
    duration_id,
    topic_id,
    outline_id,
    instructor_id,
    education_type_id,
    note,
    shift
  } = parsed.values;

  const access = restrictedEntryWhere(req.user);

  try {
    const before = await getEntrySnapshot(entryId, req.user);
    if (!before) {
      return res.status(404).json({ error: 'Nem található ilyen bejegyzés, vagy nincs hozzá jogosultság.' });
    }

    const hour_id = await resolveHourId(req.body);
    const result = await run(`
      UPDATE naplo_entries
      SET date = ?,
          hour_id = ?,
          duration_id = ?,
          topic_id = ?,
          outline_id = ?,
          instructor_id = ?,
          education_type_id = ?,
          note = COALESCE(?, note),
          user_id = ?,
          shift = ?
      WHERE id = ?${access.clause}
    `, [
      date,
      hour_id,
      duration_id,
      topic_id,
      outline_id,
      instructor_id,
      education_type_id,
      note,
      req.user.id,
      shift,
      entryId,
      ...access.params
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen bejegyzés, vagy nincs hozzá jogosultság.' });
    }

    const after = await getEntrySnapshot(entryId, req.user);
    await logAudit('update', req.user, entryId, before, after);

    res.json({ message: 'Bejegyzés sikeresen frissítve.' });
  } catch (err) {
    if (err.message === 'Az óra megadása kötelező.') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Hiba a bejegyzés frissítésekor.', details: err.message });
  }
});

router.delete('/naplo/:id', auth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Érvénytelen bejegyzésazonosító.' });
  }

  const access = restrictedEntryWhere(req.user);

  try {
    const before = await getEntrySnapshot(entryId, req.user);
    if (!before) {
      return res.status(404).json({ error: 'Nem található ilyen bejegyzés, vagy nincs hozzá jogosultság.' });
    }

    const result = await run(`DELETE FROM naplo_entries WHERE id = ?${access.clause}`, [entryId, ...access.params]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nem található ilyen bejegyzés, vagy nincs hozzá jogosultság.' });
    }

    await logAudit('delete', req.user, entryId, before, null);

    res.json({ message: 'Bejegyzés sikeresen törölve.' });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a törlés során.', details: err.message });
  }
});

router.get('/naplo', auth, async (req, res) => {
  const shiftCondition = userCanAccessAll(req.user) ? '' : 'WHERE n.shift = ?';
  const params = userCanAccessAll(req.user) ? [] : [req.user.shift];

  try {
    const rows = await all(`
      SELECT n.id,
             n.date,
             n.shift,
             n.hour_id,
             n.duration_id,
             n.topic_id,
             n.outline_id,
             n.instructor_id,
             n.education_type_id,
             n.note,
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
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a naplóbejegyzések lekérdezésekor.', details: err.message });
  }
});

router.get('/admin-only', auth, adminOnly, (req, res) => {
  res.json({ message: 'Üdvözlünk, admin!' });
});

module.exports = router;
