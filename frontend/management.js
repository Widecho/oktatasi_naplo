const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

async function loadUsers() {
    const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        document.getElementById('managementMessage').textContent = 'Hiba a felhasználók betöltésekor. Lehet, hogy nem vagy admin!';
        document.getElementById('managementMessage').style.color = 'red';
        return;
    }

    const users = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username} 
                ${user.must_change_password ? '<span style="color:red;font-size:12px;">(Jelszócsere szükséges)</span>' : ''}
            </td>
            <td>
                <select id="shift-${user.id}">
                    <option value="" disabled>Válassz</option>
                    <option value="1" ${user.shift === '1' ? 'selected' : ''}>1. Műszak</option>
                    <option value="2" ${user.shift === '2' ? 'selected' : ''}>2. Műszak</option>
                    <option value="3" ${user.shift === '3' ? 'selected' : ''}>3. Műszak</option>
                    <option value="4" ${user.shift === '4' ? 'selected' : ''}>4. Műszak</option>
                    <option value="5" ${user.shift === '5' ? 'selected' : ''}>5. Műszak</option>
                </select>
                <button onclick="updateShift(${user.id})">Mentés</button>
            </td>
            <td>
                <button onclick="resetPassword(${user.id}, '${user.username}')" style="background-color: darkorange; color: white;">Jelszó Reset (asd123)</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateShift(userId) {
    const shiftSelect = document.getElementById(`shift-${userId}`);
    const shift = shiftSelect.value;

    const res = await fetch(`${API_URL}/admin/users/${userId}/shift`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shift })
    });

    const data = await res.json();
    const msg = document.getElementById('managementMessage');

    if (res.ok) {
        msg.textContent = 'Műszak sikeresen frissítve!';
        msg.style.color = 'green';
    } else {
        msg.textContent = data.error || 'Hiba történt.';
        msg.style.color = 'red';
    }

    setTimeout(() => msg.textContent = '', 3000);
}

async function resetPassword(userId, username) {
    if (!confirm(`Biztosan resetelni akarod ${username} jelszavát az "asd123" értékre?`)) {
        return;
    }

    const res = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    const msg = document.getElementById('managementMessage');

    if (res.ok) {
        msg.textContent = `Jelszó sikeresen resetelve ${username} számára.`;
        msg.style.color = 'green';
        loadUsers(); // Refresh to show the (Jelszócsere szükséges) badge
    } else {
        msg.textContent = data.error || 'Hiba történt.';
        msg.style.color = 'red';
    }

    setTimeout(() => msg.textContent = '', 3000);
}

// Initial load
document.addEventListener('DOMContentLoaded', loadUsers);
