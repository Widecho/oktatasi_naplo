const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// Token ellenőrzés – csak admin léphessen be
try {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  if (decoded.role !== 'admin') {
    alert('Nincs jogosultságod az admin felülethez.');
    window.location.href = 'index.html';
  }
} catch (e) {
  alert('Hibás token.');
  window.location.href = 'index.html';
}

// 🟢 Új adat mentése
async function postData(endpoint, body, messageElement) {
  try {
    const res = await fetch(`${API_URL}/admin/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    messageElement.textContent = res.ok ? '✅ Sikeresen mentve.' : `❌ Hiba: ${data.error}`;
    if (res.ok) loadAllLists();
  } catch (err) {
    messageElement.textContent = '❌ Hálózati hiba.';
  }
}

// 🗑️ Törlés
async function deleteData(endpoint, id) {
  if (!confirm('Biztosan törlöd?')) return;
  const res = await fetch(`${API_URL}/admin/${endpoint}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (res.ok) {
    alert('Törölve.');
    loadAllLists();
  } else {
    alert(`Hiba: ${data.error}`);
  }
}

// 🔄 Lista betöltése
async function loadList(endpoint, containerId, field, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = 'Betöltés...';
  const res = await fetch(`${API_URL}/dropdowns`);
  const data = await res.json();
  const list = data[type];

  if (!list || list.length === 0) {
    container.innerHTML = '<i>Nincs adat.</i>';
    return;
  }

  container.innerHTML = '';
  list.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `${item[field]} <button onclick="deleteData('${endpoint}', ${item.id})">🗑️</button>`;
    container.appendChild(div);
  });
}

function loadAllLists() {
  loadList('instructors', 'instructorList', 'name', 'instructors');
  loadList('topics', 'topicList', 'name', 'topics');
  loadList('outlines', 'outlineList', 'content', 'outlines');
  loadList('durations', 'durationList', 'value', 'durations');
}

// ✏️ Beküldés 3 formhoz
document.getElementById('form-instructor').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('instructorName').value.trim();
  postData('instructors', { name }, document.getElementById('instructorMessage'));
  e.target.reset();
});

document.getElementById('form-topic').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('topicName').value.trim();
  postData('topics', { name }, document.getElementById('topicMessage'));
  e.target.reset();
});

document.getElementById('form-outline').addEventListener('submit', e => {
  e.preventDefault();
  const content = document.getElementById('outlineContent').value.trim();
  postData('outlines', { content }, document.getElementById('outlineMessage'));
  e.target.reset();
});

document.getElementById('form-duration').addEventListener('submit', e => {
  e.preventDefault();
  const value = document.getElementById('durationValue').value.trim();
  postData('durations', { value }, document.getElementById('durationMessage'));
  e.target.reset();
});

loadAllLists(); // oldal betöltésekor azonnal
