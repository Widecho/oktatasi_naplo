const API_URL = '/api';
const ALL_SHIFTS_LABEL = 'Összes';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function getFilters() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function filterEntries(entries, filters) {
  let filtered = entries;

  if (filters.type === 'month' && filters.month) {
    filtered = filtered.filter(entry => entry.date.startsWith(filters.month));
  } else if (filters.type === 'day' && filters.day) {
    filtered = filtered.filter(entry => entry.date === filters.day);
  } else if (filters.type === 'interval') {
    filtered = filtered.filter(entry => {
      const afterStart = !filters.start || entry.date >= filters.start;
      const beforeEnd = !filters.end || entry.date <= filters.end;
      return afterStart && beforeEnd;
    });
  }

  if (filters.shift && filters.shift !== ALL_SHIFTS_LABEL) {
    filtered = filtered.filter(entry => entry.shift === filters.shift);
  }

  return filtered;
}

function filterLabel(filters) {
  if (filters.type === 'month' && filters.month) return `Havi szűrés: ${filters.month}`;
  if (filters.type === 'day' && filters.day) return `Napi szűrés: ${filters.day}`;
  if (filters.type === 'interval') return `Időszak: ${filters.start || '-'} - ${filters.end || '-'}`;
  return 'Szűrés nélkül';
}

function renderTable(entries, filters) {
  const tbody = document.getElementById('entriesTableBody');
  const summary = document.getElementById('tableSummary');
  const message = document.getElementById('tableMessage');

  tbody.innerHTML = '';
  summary.textContent = `${filterLabel(filters)} | Bejegyzések száma: ${entries.length}`;

  if (entries.length === 0) {
    message.textContent = 'Nincs megjeleníthető bejegyzés.';
    return;
  }

  message.textContent = '';

  entries.forEach(entry => {
    const row = document.createElement('tr');
    [
      entry.date,
      entry.hour,
      entry.shift || '',
      entry.education_type,
      entry.duration,
      entry.instructor,
      entry.topic,
      entry.outline,
      entry.user
    ].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value || '';
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

async function loadTableView() {
  if (!requireLogin()) return;

  const filters = getFilters();
  const res = await fetch(`${API_URL}/naplo`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    document.getElementById('tableMessage').textContent = 'Hiba a bejegyzések lekérésekor.';
    return;
  }

  const entries = await res.json();
  renderTable(filterEntries(entries, filters), filters);
}

document.addEventListener('DOMContentLoaded', loadTableView);
