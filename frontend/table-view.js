const API_URL = '/api';
const ALL_SHIFTS_LABEL = 'Összes';

let tableEntries = [];
let tableFilters = {};
let sortState = { key: 'date', direction: 'asc' };

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

  const search = document.getElementById('tableSearch')?.value.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(entry => [
      entry.date,
      entry.hour,
      entry.shift,
      entry.education_type,
      entry.duration,
      entry.instructor,
      entry.topic,
      entry.outline,
      entry.note,
      entry.user
    ].some(value => String(value || '').toLowerCase().includes(search)));
  }

  return filtered;
}

function filterLabel(filters) {
  if (filters.type === 'month' && filters.month) return `Havi szűrés: ${filters.month}`;
  if (filters.type === 'day' && filters.day) return `Napi szűrés: ${filters.day}`;
  if (filters.type === 'interval') return `Időszak: ${filters.start || '-'} - ${filters.end || '-'}`;
  return 'Szűrés nélkül';
}

function sortEntries(entries) {
  const direction = sortState.direction === 'asc' ? 1 : -1;
  return [...entries].sort((a, b) => {
    const left = String(a[sortState.key] || '').toLowerCase();
    const right = String(b[sortState.key] || '').toLowerCase();
    return left.localeCompare(right, 'hu') * direction;
  });
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

  sortEntries(entries).forEach(entry => {
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
      entry.note,
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

  tableFilters = getFilters();
  const res = await fetch(`${API_URL}/naplo`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    document.getElementById('tableMessage').textContent = 'Hiba a bejegyzések lekérésekor.';
    return;
  }

  tableEntries = await res.json();
  renderTable(filterEntries(tableEntries, tableFilters), tableFilters);
}

function rerenderTable() {
  renderTable(filterEntries(tableEntries, tableFilters), tableFilters);
}

function setupTableControls() {
  document.getElementById('tableSearch').addEventListener('input', rerenderTable);
  document.querySelectorAll('[data-sort]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort;
      sortState = {
        key,
        direction: sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc'
      };
      rerenderTable();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupTableControls();
  loadTableView();
});
