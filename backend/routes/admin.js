const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const SHIFT_VALUES = new Set(['1', '2', '3', '4', '5']);
const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || 'asd123';

const LIST_RESOURCES = {
  instructors: { table: 'instructors', field: 'name', label: 'Oktató' },
  topics: { table: 'topics', field: 'name', label: 'Téma' },
  outlines: { table: 'outlines', field: 'content', label: 'Vázlat' },
  durations: { table: 'durations', field: 'value', label: 'Időtartam' },
  education_types: { table: 'education_types', field: 'name', label: 'Oktatási típus' }
};

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

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

function createListItem(resourceKey) {
  return async (req, res) => {
    const resource = LIST_RESOURCES[resourceKey];
    const value = typeof req.body[resource.field] === 'string' ? req.body[resource.field].trim() : '';

    if (!value) {
      return res.status(400).json({ error: `${resource.label} megadása kötelező.` });
    }

    try {
      const existing = await get(
        `SELECT id FROM ${resource.table} WHERE ${resource.field} = ? COLLATE NOCASE`,
        [value]
      );
      if (existing) {
        return res.status(409).json({ error: `${resource.label} már létezik.` });
      }

      const result = await run(
        `INSERT INTO ${resource.table} (${resource.field}) VALUES (?)`,
        [value]
      );
      res.status(201).json({ message: `${resource.label} sikeresen hozzáadva.`, id: result.lastID });
    } catch (err) {
      res.status(500).json({ error: `${resource.label} mentése sikertelen.`, details: err.message });
    }
  };
}

function deleteListItem(resourceKey) {
  return async (req, res) => {
    const resource = LIST_RESOURCES[resourceKey];
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Érvénytelen azonosító.' });
    }

    try {
      const result = await run(`DELETE FROM ${resource.table} WHERE id = ?`, [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: `${resource.label} nem található.` });
      }

      res.json({ message: `${resource.label} sikeresen törölve.` });
    } catch (err) {
      res.status(500).json({ error: `${resource.label} törlése sikertelen.`, details: err.message });
    }
  };
}

function updateListItem(resourceKey) {
  return async (req, res) => {
    const resource = LIST_RESOURCES[resourceKey];
    const id = Number(req.params.id);
    const value = typeof req.body[resource.field] === 'string' ? req.body[resource.field].trim() : '';

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Érvénytelen azonosító.' });
    }

    if (!value) {
      return res.status(400).json({ error: `${resource.label} megadása kötelező.` });
    }

    try {
      const existing = await get(
        `SELECT id FROM ${resource.table} WHERE ${resource.field} = ? COLLATE NOCASE AND id <> ?`,
        [value, id]
      );
      if (existing) {
        return res.status(409).json({ error: `${resource.label} már létezik.` });
      }

      const result = await run(
        `UPDATE ${resource.table} SET ${resource.field} = ? WHERE id = ?`,
        [value, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: `${resource.label} nem található.` });
      }

      res.json({ message: `${resource.label} sikeresen frissítve.` });
    } catch (err) {
      res.status(500).json({ error: `${resource.label} frissítése sikertelen.`, details: err.message });
    }
  };
}

Object.keys(LIST_RESOURCES).forEach(resourceKey => {
  router.post(`/${resourceKey}`, auth, adminOnly, createListItem(resourceKey));
  router.put(`/${resourceKey}/:id`, auth, adminOnly, updateListItem(resourceKey));
  router.delete(`/${resourceKey}/:id`, auth, adminOnly, deleteListItem(resourceKey));
});

router.get('/backup', auth, adminOnly, (req, res) => {
  const dbPath = path.resolve(__dirname, '../../oktatasi_naplo.db');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.download(dbPath, `oktatasi_naplo_backup_${timestamp}.db`);
});

router.get('/audit-logs', auth, adminOnly, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  try {
    const rows = await all(`
      SELECT id, entry_id, action, user_id, username, created_at, before_json, after_json
      FROM audit_logs
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `, [limit]);

    res.json(rows.map(row => ({
      ...row,
      before: row.before_json ? JSON.parse(row.before_json) : null,
      after: row.after_json ? JSON.parse(row.after_json) : null,
      before_json: undefined,
      after_json: undefined
    })));
  } catch (err) {
    res.status(500).json({ error: 'Hiba az audit napló lekérdezésekor.', details: err.message });
  }
});

router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const rows = await all(`
      SELECT id, username, role, shift, must_change_password
      FROM users
      WHERE role = 'user'
      ORDER BY username COLLATE NOCASE ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a felhasználók betöltésekor.', details: err.message });
  }
});

router.post('/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Érvénytelen felhasználóazonosító.' });
  }

  try {
    const defaultPassword = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);
    const result = await run(
      "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ? AND role = 'user'",
      [defaultPassword, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    res.json({ message: `Jelszó sikeresen visszaállítva az "${DEFAULT_RESET_PASSWORD}" értékre.` });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a jelszó reset során.', details: err.message });
  }
});

router.put('/users/:id/shift', auth, adminOnly, async (req, res) => {
  const userId = Number(req.params.id);
  const shift = req.body.shift ? String(req.body.shift).trim() : '';

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Érvénytelen felhasználóazonosító.' });
  }

  if (!SHIFT_VALUES.has(shift)) {
    return res.status(400).json({ error: 'Érvényes műszak megadása kötelező.' });
  }

  try {
    const result = await run(
      "UPDATE users SET shift = ? WHERE id = ? AND role = 'user'",
      [shift, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    res.json({ message: 'Műszak sikeresen frissítve.' });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a műszak frissítésekor.', details: err.message });
  }
});

module.exports = router;
