const API_URL = '/api';
const ALL_SHIFTS_LABEL = 'Összes';

let editingId = null;

function getToken() {
  return localStorage.getItem('token');
}

function decodeToken() {
  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (err) {
    return null;
  }
}

function authHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    Authorization: `Bearer ${getToken()}`
  };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('shift');
  window.location.href = 'login.html';
}

function requireLogin() {
  if (!getToken() || !decodeToken()) {
    window.location.href = 'login.html';
    return null;
  }

  return decodeToken();
}

function setMessage(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = message;
}

function createButton(label, onClick, type = 'button') {
  const button = document.createElement('button');
  button.type = type;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function currentDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage('error', data.error || 'Hiba történt a bejelentkezéskor.');
      return;
    }

    localStorage.setItem('token', data.token);
    const payload = decodeToken();
    if (payload) {
      localStorage.setItem('role', payload.role);
      localStorage.setItem('shift', payload.shift || '');
    }

    if (data.mustChangePassword) {
      loginForm.style.display = 'none';
      document.getElementById('changePasswordModal').style.display = 'block';
      setMessage('error', '');
    } else {
      window.location.href = 'index.html';
    }
  });
}

const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;

    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage('changePasswordError', data.error || 'A jelszó módosítása sikertelen.');
        return;
      }

      alert('Sikeres jelszóváltoztatás!');
      window.location.href = 'index.html';
    } catch (err) {
      setMessage('changePasswordError', 'Hiba történt a csatlakozáskor.');
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const secretCodeInput = document.getElementById('secretCode');
  const shiftSelect = document.getElementById('regShift');

  if (secretCodeInput && shiftSelect) {
    secretCodeInput.addEventListener('input', () => {
      const isAdmin = secretCodeInput.value === 'cicakutya';
      shiftSelect.style.display = isAdmin ? 'none' : 'block';
      shiftSelect.required = !isAdmin;
      if (isAdmin) shiftSelect.value = '';
    });
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const secretCode = document.getElementById('secretCode').value;
    const shift = shiftSelect ? shiftSelect.value : null;

    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, secretCode, shift })
    });

    const data = await res.json();
    setMessage('regMessage', res.ok ? 'Regisztráció sikeres!' : data.error || 'Regisztráció sikertelen.');

    if (res.ok) {
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    }
  });
}

const entryForm = document.getElementById('entryForm');
if (entryForm) {
  const user = requireLogin();
  const cancelBtn = document.getElementById('cancelEdit');

  if (user) {
    setTodayDate();
    setupAdminLinks(user);
    loadDropdowns();
    populateMonthSelect();
    initDateFilters();
    loadEntries();
  }

  entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      date: document.getElementById('date').value,
      hour_text: document.getElementById('hourText').value.trim(),
      education_type_id: Number(document.getElementById('education_types').value),
      duration_id: Number(document.getElementById('durations').value),
      instructor_id: Number(document.getElementById('instructors').value),
      topic_id: Number(document.getElementById('topics').value),
      outline_id: Number(document.getElementById('outlines').value)
    };

    const shiftSelect = document.getElementById('shift');
    if (shiftSelect && shiftSelect.style.display !== 'none') {
      body.shift = shiftSelect.value;
    }

    const url = editingId === null ? `${API_URL}/naplo` : `${API_URL}/naplo/${editingId}`;
    const method = editingId === null ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    const data = await res.json();
    setMessage('response', res.ok
      ? editingId === null ? 'Sikeres mentés!' : 'Bejegyzés frissítve.'
      : data.error || 'A mentés sikertelen.');

    if (res.ok) {
      resetEntryForm();
      loadEntries();
    }
  });

  cancelBtn.addEventListener('click', () => {
    resetEntryForm();
    setMessage('response', 'Szerkesztés megszakítva.');
  });
}

function setupAdminLinks(user) {
  if (user.role !== 'admin') return;

  const container = document.createElement('div');
  container.className = 'top-actions';

  const adminLink = document.createElement('a');
  adminLink.href = 'admin.html';
  adminLink.appendChild(createButton('Admin felület', () => {}));

  const managementLink = document.createElement('a');
  managementLink.href = 'management.html';
  managementLink.appendChild(createButton('Felhasználó menedzsment', () => {}));

  container.appendChild(adminLink);
  container.appendChild(managementLink);
  document.body.insertBefore(container, entryForm);

  const shiftSelect = document.getElementById('shift');
  if (shiftSelect) {
    shiftSelect.style.display = 'inline-block';
    shiftSelect.required = true;
  }

  const filterShiftContainer = document.getElementById('shiftFilterContainer');
  if (filterShiftContainer) {
    filterShiftContainer.style.display = 'inline';
  }
}

async function loadDropdowns() {
  try {
    const res = await fetch(`${API_URL}/dropdowns`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'A legördülő adatok betöltése sikertelen.');
    }

    Object.entries(data).forEach(([key, list]) => {
      if (key === 'hours') {
        const dataList = document.getElementById('hoursList');
        if (!dataList) return;

        dataList.innerHTML = '';
        list.forEach(item => {
          const option = document.createElement('option');
          option.value = item.name;
          dataList.appendChild(option);
        });
        return;
      }

      const select = document.getElementById(key);
      if (!select) return;

      select.innerHTML = '';
      list.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name || item.value || item.content;
        select.appendChild(option);
      });
    });
  } catch (err) {
    setMessage('response', err.message);
  }
}

function initDateFilters() {
  const todayStr = currentDateString();
  if (document.getElementById('daySelect')) document.getElementById('daySelect').value = todayStr;
  if (document.getElementById('startDate')) document.getElementById('startDate').value = todayStr;
  if (document.getElementById('endDate')) document.getElementById('endDate').value = todayStr;
}

function populateMonthSelect() {
  const monthSelect = document.getElementById('monthSelect');
  if (!monthSelect) return;

  const now = new Date();
  const year = now.getFullYear();
  monthSelect.innerHTML = '';

  for (let m = 1; m <= 12; m++) {
    const option = document.createElement('option');
    option.value = `${year}-${String(m).padStart(2, '0')}`;
    option.textContent = `${year}. ${String(m).padStart(2, '0')}`;
    monthSelect.appendChild(option);
  }

  monthSelect.value = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadEntries() {
  const container = document.getElementById('entryList');
  if (!container) return;

  const res = await fetch(`${API_URL}/naplo`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    container.innerText = 'Hiba a bejegyzések lekérésekor.';
    return;
  }

  const entries = await res.json();
  const filtered = filterEntries(entries);
  const grouped = groupEntriesByDate(filtered);

  container.innerHTML = '';
  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<p><i>Nincs megjeleníthető bejegyzés.</i></p>';
    return;
  }

  Object.keys(grouped).sort().forEach(date => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-group';

    const title = document.createElement('h3');
    title.textContent = date;
    dayDiv.appendChild(title);

    grouped[date].forEach(entry => {
      dayDiv.appendChild(renderEntry(entry));
    });

    container.appendChild(dayDiv);
  });
}

function filterEntries(entries) {
  const filterType = document.getElementById('filterType') ? document.getElementById('filterType').value : 'month';
  let filtered = entries;

  if (filterType === 'month') {
    const selectedMonth = document.getElementById('monthSelect')?.value || new Date().toISOString().slice(0, 7);
    filtered = entries.filter(e => e.date.startsWith(selectedMonth));
  } else if (filterType === 'day') {
    const selectedDay = document.getElementById('daySelect').value;
    filtered = selectedDay ? entries.filter(e => e.date === selectedDay) : entries;
  } else if (filterType === 'interval') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    filtered = entries.filter(e => (!start || e.date >= start) && (!end || e.date <= end));
  }

  const filterShiftContainer = document.getElementById('shiftFilterContainer');
  if (filterShiftContainer && filterShiftContainer.style.display !== 'none') {
    const selectedShift = document.getElementById('filterShift').value;
    if (selectedShift !== ALL_SHIFTS_LABEL) {
      filtered = filtered.filter(e => e.shift === selectedShift);
    }
  }

  return filtered;
}

function groupEntriesByDate(entries) {
  return entries.reduce((grouped, entry) => {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
    return grouped;
  }, {});
}

function renderEntry(entry) {
  const item = document.createElement('div');
  item.className = 'entry-item';

  const summary = document.createElement('p');
  const shiftStr = entry.shift ? ` [${entry.shift}]` : '';
  const strong = document.createElement('strong');
  strong.textContent = entry.hour;
  summary.appendChild(strong);
  summary.appendChild(document.createTextNode(`${shiftStr} - ${entry.education_type} - ${entry.instructor} - ${entry.topic}`));

  const outline = document.createElement('em');
  outline.textContent = entry.outline;

  const user = document.createElement('small');
  user.textContent = `Kitöltötte: ${entry.user}`;

  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  actions.appendChild(createButton('Szerkesztés', () => editEntry(entry)));
  actions.appendChild(createButton('Törlés', () => deleteEntry(entry.id)));

  item.appendChild(summary);
  item.appendChild(outline);
  item.appendChild(document.createElement('br'));
  item.appendChild(user);
  item.appendChild(actions);

  return item;
}

async function deleteEntry(id) {
  if (!confirm('Biztosan törlöd ezt a bejegyzést?')) return;

  const res = await fetch(`${API_URL}/naplo/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  if (res.ok) {
    alert('Bejegyzés törölve.');
    loadEntries();
  } else {
    const data = await res.json();
    alert(data.error || 'Hiba történt a törlés során.');
  }
}

function editEntry(entry) {
  document.getElementById('date').value = entry.date;
  document.getElementById('hourText').value = entry.hour;
  setSelectValue('education_types', entry.education_type_id);
  setSelectValue('durations', entry.duration_id);
  setSelectValue('instructors', entry.instructor_id);
  setSelectValue('topics', entry.topic_id);
  setSelectValue('outlines', entry.outline_id);

  const shiftSelect = document.getElementById('shift');
  if (shiftSelect && shiftSelect.style.display !== 'none') {
    shiftSelect.value = entry.shift || '';
  }

  editingId = entry.id;
  setMessage('response', 'Szerkesztési mód: módosítasz egy bejegyzést.');
  entryForm.classList.add('editing-mode');
  entryForm.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('cancelEdit').style.display = 'inline-block';
}

function setSelectValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (select) select.value = String(value);
}

function resetEntryForm() {
  entryForm.reset();
  setTodayDate();
  editingId = null;
  entryForm.classList.remove('editing-mode');
  document.getElementById('cancelEdit').style.display = 'none';
}

function updateFilterUI() {
  const type = document.getElementById('filterType').value;
  document.getElementById('monthFilterContainer').style.display = type === 'month' ? 'inline' : 'none';
  document.getElementById('dayFilterContainer').style.display = type === 'day' ? 'inline' : 'none';
  document.getElementById('intervalFilterContainer').style.display = type === 'interval' ? 'inline' : 'none';
}

function exportToExcel() {
  const type = document.getElementById('filterType') ? document.getElementById('filterType').value : 'month';
  const params = new URLSearchParams({ type, token: getToken() });

  if (type === 'month') {
    const month = document.getElementById('monthSelect').value;
    if (!month) return alert('Válassz hónapot!');
    params.set('month', month);
  } else if (type === 'day') {
    const day = document.getElementById('daySelect').value;
    if (!day) return alert('Válassz napot!');
    params.set('day', day);
  } else if (type === 'interval') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) return alert('Válaszd ki a kezdő és végdátumot!');
    params.set('start', start);
    params.set('end', end);
  }

  const filterShiftContainer = document.getElementById('shiftFilterContainer');
  if (filterShiftContainer && filterShiftContainer.style.display !== 'none') {
    params.set('shift', document.getElementById('filterShift').value);
  }

  window.open(`${API_URL}/export?${params.toString()}`, '_blank');
}

function openTableView() {
  const type = document.getElementById('filterType') ? document.getElementById('filterType').value : 'month';
  const params = new URLSearchParams({ type });

  if (type === 'month') {
    const month = document.getElementById('monthSelect').value;
    if (!month) return alert('Válassz hónapot!');
    params.set('month', month);
  } else if (type === 'day') {
    const day = document.getElementById('daySelect').value;
    if (!day) return alert('Válassz napot!');
    params.set('day', day);
  } else if (type === 'interval') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) return alert('Válaszd ki a kezdő és végdátumot!');
    params.set('start', start);
    params.set('end', end);
  }

  const filterShiftContainer = document.getElementById('shiftFilterContainer');
  if (filterShiftContainer && filterShiftContainer.style.display !== 'none') {
    params.set('shift', document.getElementById('filterShift').value);
  }

  window.location.href = `table-view.html?${params.toString()}`;
}

function setTodayDate() {
  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.value = currentDateString();
}

window.logout = logout;
window.updateFilterUI = updateFilterUI;
window.loadEntries = loadEntries;
window.exportToExcel = exportToExcel;
window.openTableView = openTableView;
