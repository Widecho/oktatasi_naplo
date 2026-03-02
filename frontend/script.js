const API_URL = 'http://localhost:3000/api';
let editingId = null;

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// ✅ Login oldal logika
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } else {
      document.getElementById('error').textContent = data.error || 'Hiba';
    }
  });
}

// ✅ Regisztráció oldal logika
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const secretCode = document.getElementById('secretCode').value;

    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, secretCode })
    });

    const data = await res.json();
    const msgElement = document.getElementById('regMessage');
    msgElement.textContent = res.ok ? '✅ Regisztráció sikeres!' : `❌ ${data.error}`;

    if (res.ok) {
      setTimeout(() => window.location.href = 'login.html', 1500);
    }
  });
}

// ✅ Napló oldal logika
const entryForm = document.getElementById('entryForm');
if (entryForm) {
  const cancelBtn = document.getElementById('cancelEdit');
  setTodayDate();
  const token = localStorage.getItem('token');

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    if (decoded.role === 'admin') {
      const adminBtn = document.createElement('a');
      adminBtn.href = 'admin.html';
      adminBtn.innerHTML = '<button type="button">⚙️ Admin felület</button>';
      document.body.insertBefore(adminBtn, entryForm);
    }
  } catch (err) {
    console.warn('Token dekódolása sikertelen:', err);
  }

  fetch(`${API_URL}/dropdowns`)
    .then(res => res.json())
    .then(data => {
      for (const [key, list] of Object.entries(data)) {
        const select = document.getElementById(key);
        if (!select) continue;

        list.forEach(item => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = item.name || item.value || item.content;
          select.appendChild(option);
        });
      }
    })
    .catch(err => console.error('Hiba a legördülők betöltésekor:', err));

  entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      date: document.getElementById('date').value,
      hour_id: parseInt(document.getElementById('hours').value),
      education_type_id: parseInt(document.getElementById('education_types').value),
      duration_id: parseInt(document.getElementById('durations').value),
      instructor_id: parseInt(document.getElementById('instructors').value),
      topic_id: parseInt(document.getElementById('topics').value),
      outline_id: parseInt(document.getElementById('outlines').value)
    };

    let url = `${API_URL}/naplo`;
    let method = 'POST';

    if (editingId !== null) {
      url += `/${editingId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    document.getElementById('response').textContent = res.ok
      ? editingId ? 'Bejegyzés frissítve.' : 'Sikeres mentés!'
      : data.error;

    if (res.ok) {
      entryForm.reset();
      setTodayDate();
      editingId = null;
      entryForm.classList.remove('editing-mode');
      cancelBtn.style.display = 'none';
      loadEntries();
    }
  });

  cancelBtn.addEventListener('click', () => {
    entryForm.reset();
    setTodayDate();
    editingId = null;
    entryForm.classList.remove('editing-mode');
    cancelBtn.style.display = 'none';
    document.getElementById('response').textContent = 'Szerkesztés megszakítva.';
  });

  populateMonthSelect();
  initDateFilters();
  loadEntries();
}

function initDateFilters() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (document.getElementById('daySelect')) document.getElementById('daySelect').value = todayStr;
  if (document.getElementById('startDate')) document.getElementById('startDate').value = todayStr;
  if (document.getElementById('endDate')) document.getElementById('endDate').value = todayStr;
}

function populateMonthSelect() {
  const monthSelect = document.getElementById('monthSelect');
  const now = new Date();
  const year = now.getFullYear();

  for (let m = 1; m <= 12; m++) {
    const option = document.createElement('option');
    option.value = `${year}-${String(m).padStart(2, '0')}`;
    option.textContent = `${year}. ${String(m).padStart(2, '0')}`;
    monthSelect.appendChild(option);
  }

  monthSelect.value = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadEntries() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('entryList');
  if (!container) return;

  const res = await fetch(`${API_URL}/naplo`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    container.innerText = 'Hiba a bejegyzések lekérésekor.';
    return;
  }

  const entries = await res.json();

  const filterType = document.getElementById('filterType') ? document.getElementById('filterType').value : 'month';
  let filtered = [];

  if (filterType === 'month') {
    const monthSelect = document.getElementById('monthSelect');
    const selectedMonth = monthSelect ? monthSelect.value : new Date().toISOString().slice(0, 7);
    filtered = entries.filter(e => e.date.startsWith(selectedMonth));
  } else if (filterType === 'day') {
    const selectedDay = document.getElementById('daySelect').value;
    if (selectedDay) {
      filtered = entries.filter(e => e.date === selectedDay);
    } else {
      filtered = entries;
    }
  } else if (filterType === 'interval') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    filtered = entries.filter(e => {
      let isMatch = true;
      if (start && e.date < start) isMatch = false;
      if (end && e.date > end) isMatch = false;
      return isMatch;
    });
  }

  const grouped = {};
  filtered.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  container.innerHTML = '';

  Object.keys(grouped).sort().forEach(date => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-group';
    dayDiv.innerHTML = `<h3>${date}</h3>`;

    grouped[date].forEach(entry => {
      const p = document.createElement('p');
      p.className = 'entry-item';
      p.innerHTML = `
        <strong>${entry.hour}</strong> – ${entry.education_type} – ${entry.instructor} – ${entry.topic}<br>
        <em>${entry.outline}</em><br>
        <small>Kitöltötte: ${entry.user}</small><br>
        <button onclick="editEntry(${entry.id}, '${entry.date}', '${entry.hour}', '${entry.education_type}', '${entry.duration}', '${entry.instructor}', '${entry.topic}', '${entry.outline}')">✏️</button>
        <button onclick="deleteEntry(${entry.id})">🗑️</button>
        <hr>
      `;
      dayDiv.appendChild(p);
    });

    container.appendChild(dayDiv);
  });
}



async function deleteEntry(id) {
  const token = localStorage.getItem('token');
  if (!confirm('Biztosan törlöd ezt a bejegyzést?')) return;

  const res = await fetch(`${API_URL}/naplo/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    alert('Bejegyzés törölve.');
    loadEntries();
  } else {
    alert('Hiba történt a törlés során.');
  }
}

function editEntry(id, date, hour, education_type, duration, instructor, topic, outline) {
  document.getElementById('date').value = date;
  setDropdownValue('hours', hour);
  setDropdownValue('education_types', education_type);
  setDropdownValue('durations', duration);
  setDropdownValue('instructors', instructor);
  setDropdownValue('topics', topic);
  setDropdownValue('outlines', outline);

  editingId = id;
  document.getElementById('response').textContent = '✏️ Szerkesztési mód: módosítasz egy bejegyzést.';
  document.getElementById('entryForm').classList.add('editing-mode');
  document.querySelector('#entryForm').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('cancelEdit').style.display = 'inline-block';
}

function setDropdownValue(selectId, label) {
  const select = document.getElementById(selectId);
  for (const option of select.options) {
    if (option.textContent === label) {
      select.value = option.value;
      break;
    }
  }
}

function updateFilterUI() {
  const type = document.getElementById('filterType').value;
  document.getElementById('monthFilterContainer').style.display = type === 'month' ? 'inline' : 'none';
  document.getElementById('dayFilterContainer').style.display = type === 'day' ? 'inline' : 'none';
  document.getElementById('intervalFilterContainer').style.display = type === 'interval' ? 'inline' : 'none';
}

function exportToExcel() {
  const type = document.getElementById('filterType') ? document.getElementById('filterType').value : 'month';
  let url = `${API_URL}/export?type=${type}`;

  if (type === 'month') {
    const month = document.getElementById('monthSelect').value;
    if (!month) return alert('Válassz hónapot!');
    url += `&month=${month}`;
  } else if (type === 'day') {
    const day = document.getElementById('daySelect').value;
    if (!day) return alert('Válassz napot!');
    url += `&day=${day}`;
  } else if (type === 'interval') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) return alert('Válaszd ki a kezdő és végdátumot!');
    url += `&start=${start}&end=${end}`;
  }

  window.open(url, '_blank');
}


function setTodayDate() {
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }
}
