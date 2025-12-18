const API_URL = 'http://localhost:3000/api';
let editingId = null;

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

// ✅ Napló oldal logika
const entryForm = document.getElementById('entryForm');
if (entryForm) {
  const cancelBtn = document.getElementById('cancelEdit');
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
      editingId = null;
      entryForm.classList.remove('editing-mode');
      cancelBtn.style.display = 'none';
      loadEntries();
    }
  });

  cancelBtn.addEventListener('click', () => {
    entryForm.reset();
    editingId = null;
    entryForm.classList.remove('editing-mode');
    cancelBtn.style.display = 'none';
    document.getElementById('response').textContent = 'Szerkesztés megszakítva.';
  });

  loadEntries();
  populateMonthSelect();
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
  const monthSelect = document.getElementById('monthSelect');
  if (!container || !monthSelect) return;

  const res = await fetch(`${API_URL}/naplo`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    container.innerText = 'Hiba a bejegyzések lekérésekor.';
    return;
  }

  const entries = await res.json();
  const selectedMonth = monthSelect.value || new Date().toISOString().slice(0, 7);
  const filtered = entries.filter(e => e.date.startsWith(selectedMonth));
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
        <strong>${entry.hour}</strong> – ${entry.instructor} – ${entry.topic}<br>
        <em>${entry.outline}</em><br>
        <small>Kitöltötte: ${entry.user}</small><br>
        <button onclick="editEntry(${entry.id}, '${entry.date}', '${entry.hour}', '${entry.duration}', '${entry.instructor}', '${entry.topic}', '${entry.outline}')">✏️</button>
        <button onclick="deleteEntry(${entry.id})">🗑️</button>
        <hr>
      `;
      dayDiv.appendChild(p);
    });

    container.appendChild(dayDiv);
  });
}

async function loadMonthlyEntries() {
  loadEntries();
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

function editEntry(id, date, hour, duration, instructor, topic, outline) {
  document.getElementById('date').value = date;
  setDropdownValue('hours', hour);
  setDropdownValue('durations', duration);
  setDropdownValue('instructors', instructor);
  setDropdownValue('topics', topic);
  setDropdownValue('outlines', outline);

  editingId = id;
  document.getElementById('response').textContent = '✏️ Szerkesztési mód: módosítasz egy bejegyzést.';
  document.getElementById('entryForm').classList.add('editing-mode');
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

function exportToExcel() {
  const month = document.getElementById('monthSelect').value;
  if (!month) return alert('Válassz hónapot!');
  const [ev, honap] = month.split('-');
  window.open(`${API_URL}/export/${ev}/${honap}`, '_blank');
}

