const API_URL = '/api';
const token = localStorage.getItem('token');

const LISTS = [
  { endpoint: 'instructors', containerId: 'instructorList', field: 'name', type: 'instructors' },
  { endpoint: 'education_types', containerId: 'educationTypeList', field: 'name', type: 'education_types' },
  { endpoint: 'topics', containerId: 'topicList', field: 'name', type: 'topics' },
  { endpoint: 'outlines', containerId: 'outlineList', field: 'content', type: 'outlines' },
  { endpoint: 'durations', containerId: 'durationList', field: 'value', type: 'durations' }
];

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
    alert('Nincs jogosultságod az admin felülethez.');
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

async function postData(endpoint, body, messageElement) {
  try {
    const res = await fetch(`${API_URL}/admin/${endpoint}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    const data = await res.json();
    messageElement.textContent = res.ok ? 'Sikeresen mentve.' : data.error || 'Hiba történt.';
    if (res.ok) loadAllLists();
  } catch (err) {
    messageElement.textContent = 'Hálózati hiba.';
  }
}

async function deleteData(endpoint, id) {
  if (!confirm('Biztosan törlöd?')) return;

  const res = await fetch(`${API_URL}/admin/${endpoint}/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();

  if (res.ok) {
    alert('Törölve.');
    loadAllLists();
  } else {
    alert(data.error || 'Hiba történt a törléskor.');
  }
}

async function loadList(config, dropdownData) {
  const container = document.getElementById(config.containerId);
  const list = dropdownData[config.type] || [];

  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<i>Nincs adat.</i>';
    return;
  }

  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'list-row';

    const label = document.createElement('span');
    label.textContent = item[config.field];

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Törlés';
    button.addEventListener('click', () => deleteData(config.endpoint, item.id));

    row.appendChild(label);
    row.appendChild(button);
    container.appendChild(row);
  });
}

async function loadAllLists() {
  try {
    LISTS.forEach(config => {
      document.getElementById(config.containerId).textContent = 'Betöltés...';
    });

    const res = await fetch(`${API_URL}/dropdowns`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'A listák betöltése sikertelen.');

    LISTS.forEach(config => loadList(config, data));
  } catch (err) {
    LISTS.forEach(config => {
      document.getElementById(config.containerId).textContent = err.message;
    });
  }
}

function bindForm(formId, inputId, endpoint, field, messageId) {
  document.getElementById(formId).addEventListener('submit', e => {
    e.preventDefault();
    const value = document.getElementById(inputId).value.trim();
    postData(endpoint, { [field]: value }, document.getElementById(messageId));
    e.target.reset();
  });
}

if (requireAdmin()) {
  bindForm('form-instructor', 'instructorName', 'instructors', 'name', 'instructorMessage');
  bindForm('form-education-type', 'educationTypeName', 'education_types', 'name', 'educationTypeMessage');
  bindForm('form-topic', 'topicName', 'topics', 'name', 'topicMessage');
  bindForm('form-outline', 'outlineContent', 'outlines', 'content', 'outlineMessage');
  bindForm('form-duration', 'durationValue', 'durations', 'value', 'durationMessage');
  loadAllLists();
}

window.logout = logout;
