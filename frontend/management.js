const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('shift');
  window.location.href = 'login.html';
}

function decodeToken() {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (err) {
    return null;
  }
}

function requireAdmin() {
  const decoded = decodeToken();
  if (!decoded || decoded.role !== 'admin') {
    alert('Nincs jogosultságod a felhasználó menedzsmenthez.');
    window.location.href = 'index.html';
    return false;
  }

  return true;
}

function authHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`
  };
}

function setManagementMessage(text, color = 'green') {
  const msg = document.getElementById('managementMessage');
  msg.textContent = text;
  msg.style.color = color;

  if (text) {
    setTimeout(() => {
      msg.textContent = '';
    }, 3000);
  }
}

async function loadUsers() {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    setManagementMessage('Hiba a felhasználók betöltésekor. Lehet, hogy nem vagy admin.', 'red');
    return;
  }

  const users = await res.json();
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  users.forEach(user => {
    tbody.appendChild(renderUserRow(user));
  });
}

function renderUserRow(user) {
  const tr = document.createElement('tr');

  const idCell = document.createElement('td');
  idCell.textContent = user.id;

  const nameCell = document.createElement('td');
  nameCell.textContent = user.username;
  if (user.must_change_password) {
    const badge = document.createElement('span');
    badge.className = 'warning-badge';
    badge.textContent = 'Jelszócsere szükséges';
    nameCell.appendChild(document.createTextNode(' '));
    nameCell.appendChild(badge);
  }

  const shiftCell = document.createElement('td');
  const shiftSelect = createShiftSelect(user);
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Mentés';
  saveButton.addEventListener('click', () => updateShift(user.id, shiftSelect.value));
  shiftCell.appendChild(shiftSelect);
  shiftCell.appendChild(saveButton);

  const actionsCell = document.createElement('td');
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'warning-button';
  resetButton.textContent = 'Jelszó reset';
  resetButton.addEventListener('click', () => resetPassword(user.id, user.username));
  actionsCell.appendChild(resetButton);

  tr.appendChild(idCell);
  tr.appendChild(nameCell);
  tr.appendChild(shiftCell);
  tr.appendChild(actionsCell);

  return tr;
}

function createShiftSelect(user) {
  const select = document.createElement('select');
  select.id = `shift-${user.id}`;

  ['', '1', '2', '3', '4', '5'].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.disabled = value === '';
    option.textContent = value ? `${value}. műszak` : 'Válassz';
    option.selected = user.shift === value;
    select.appendChild(option);
  });

  return select;
}

async function updateShift(userId, shift) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/shift`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ shift })
  });

  const data = await res.json();
  if (res.ok) {
    setManagementMessage('Műszak sikeresen frissítve!');
  } else {
    setManagementMessage(data.error || 'Hiba történt.', 'red');
  }
}

async function resetPassword(userId, username) {
  if (!confirm(`Biztosan resetelni akarod ${username} jelszavát?`)) {
    return;
  }

  const res = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: authHeaders()
  });

  const data = await res.json();
  if (res.ok) {
    setManagementMessage(`Jelszó sikeresen resetelve ${username} számára.`);
    loadUsers();
  } else {
    setManagementMessage(data.error || 'Hiba történt.', 'red');
  }
}

if (requireAdmin()) {
  document.addEventListener('DOMContentLoaded', loadUsers);
}

window.logout = logout;
