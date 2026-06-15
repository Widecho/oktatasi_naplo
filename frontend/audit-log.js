const API_URL = '/api';

let auditRows = [];

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function requireAdmin() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    if (decoded.role !== 'admin') {
      window.location.href = 'index.html';
      return false;
    }
  } catch (err) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function formatAction(action) {
  if (action === 'update') return 'Szerkesztés';
  if (action === 'delete') return 'Törlés';
  return action;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('hu-HU');
}

function entrySummary(entry) {
  if (!entry) return '';
  return [
    entry.date,
    entry.hour,
    entry.shift ? `${entry.shift}. műszak` : '',
    entry.education_type,
    entry.instructor,
    entry.topic
  ].filter(Boolean).join(' | ');
}

function detailSummary(entry) {
  if (!entry) return '';
  return [
    `Dátum: ${entry.date || ''}`,
    `Óra: ${entry.hour || ''}`,
    `Műszak: ${entry.shift || ''}`,
    `Oktatás típusa: ${entry.education_type || ''}`,
    `Időtartam: ${entry.duration || ''}`,
    `Oktató: ${entry.instructor || ''}`,
    `Téma: ${entry.topic || ''}`,
    `Vázlat: ${entry.outline || ''}`,
    `Kitöltötte: ${entry.user || ''}`
  ].join('\n');
}

function matchesSearch(row, search) {
  if (!search) return true;
  return [
    row.action,
    row.username,
    row.entry_id,
    row.created_at,
    entrySummary(row.before),
    entrySummary(row.after),
    detailSummary(row.before),
    detailSummary(row.after)
  ].some(value => String(value || '').toLowerCase().includes(search));
}

function renderAuditLogs() {
  const tbody = document.getElementById('auditLogBody');
  const message = document.getElementById('auditMessage');
  const search = document.getElementById('auditSearch').value.trim().toLowerCase();
  const rows = auditRows.filter(row => matchesSearch(row, search));

  tbody.innerHTML = '';
  if (rows.length === 0) {
    message.textContent = 'Nincs megjeleníthető naplóbejegyzés.';
    return;
  }

  message.textContent = `Megjelenített naplóbejegyzések: ${rows.length}`;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    [
      formatDateTime(row.created_at),
      formatAction(row.action),
      row.username || '',
      `#${row.entry_id || ''}`,
      detailSummary(row.before),
      detailSummary(row.after)
    ].forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function loadAuditLogs() {
  if (!requireAdmin()) return;

  const res = await fetch(`${API_URL}/admin/audit-logs?limit=200`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    document.getElementById('auditMessage').textContent = 'Hiba a módosítási napló lekérésekor.';
    return;
  }

  auditRows = await res.json();
  renderAuditLogs();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auditSearch').addEventListener('input', renderAuditLogs);
  loadAuditLogs();
});

window.loadAuditLogs = loadAuditLogs;
