// Parts Manager script
// Fields use keys exactly like your part.json: "Part no.", "Description", "Type", "Location", "ATA"

// Helpers for SHA-256 hashing
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function savePartsToLocal(parts) { localStorage.setItem('parts', JSON.stringify(parts)); }
function loadPartsFromLocal() { return JSON.parse(localStorage.getItem('parts') || '[]'); }

function getAdminUser() {
  const raw = localStorage.getItem('adminUser');
  return raw ? JSON.parse(raw) : null;
}
function setAdminUser(username, passHash) {
  localStorage.setItem('adminUser', JSON.stringify({ username, passHash }));
}

/* Bootstrap default admin if none */
(async function bootstrapAdmin() {
  if (!getAdminUser()) {
    const defaultUser = 'admin';
    const defaultPass = 'admin123';
    const h = await sha256Hex(defaultPass);
    setAdminUser(defaultUser, h);
    console.warn('Default admin created: username=admin password=admin123. Change it after first login!');
  }
})();

/* Auth UI */
const authArea = document.getElementById('authArea');
const adminBanner = document.getElementById('adminBanner');
const adminNameSpan = document.getElementById('adminName');
const logoutBtn = document.getElementById('logoutBtn');
const adminControls = document.getElementById('adminControls');
const changePassBtn = document.getElementById('changePassBtn');
const resetDefaultBtn = document.getElementById('resetDefaultBtn');
const exportBtn = document.getElementById('exportBtn');

function renderAuthArea() {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const adminUser = getAdminUser();
  authArea.innerHTML = '';

  if (isAdmin && adminUser) {
    adminBanner.classList.remove('d-none');
    adminNameSpan.textContent = adminUser.username;
    adminControls.classList.remove('d-none');
  } else {
    adminBanner.classList.add('d-none');
    adminControls.classList.add('d-none');
    authArea.innerHTML = `
      <form id="loginForm" class="d-flex gx-2">
        <input id="loginUser" class="form-control form-control-sm me-2" placeholder="username" required>
        <input id="loginPass" type="password" class="form-control form-control-sm me-2" placeholder="password" required>
        <button class="btn btn-sm btn-outline-primary" type="submit">Login</button>
      </form>
    `;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  }
}

logoutBtn?.addEventListener('click', () => {
  sessionStorage.removeItem('isAdmin');
  renderAuthArea();
  renderTable(document.getElementById('search').value || '');
});

async function handleLogin(e) {
  e?.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const adminUser = getAdminUser();
  if (!adminUser) { alert('No admin configured.'); return; }
  if (u !== adminUser.username) { alert('Incorrect username or password'); return; }

  const h = await sha256Hex(p);
  if (h === adminUser.passHash) {
    sessionStorage.setItem('isAdmin', 'true');
    renderAuthArea();
    renderTable(document.getElementById('search').value || '');
  } else {
    alert('Incorrect username or password');
  }
}

/* Admin actions */
changePassBtn?.addEventListener('click', async () => {
  const oldPass = prompt('Enter current admin password:');
  if (oldPass === null) return;
  const adminUser = getAdminUser();
  if (!adminUser) { alert('No admin set'); return; }
  const oldH = await sha256Hex(oldPass);
  if (oldH !== adminUser.passHash) { alert('Current password incorrect'); return; }

  const newPass = prompt('Enter NEW admin password (min length 4):');
  if (newPass === null || newPass.length < 4) { alert('Password not changed (min length 4)'); return; }
  const newH = await sha256Hex(newPass);
  setAdminUser(adminUser.username, newH);
  alert('Admin password changed.');
});

resetDefaultBtn?.addEventListener('click', async () => {
  if (!confirm('Reset admin to default username=admin password=admin123?')) return;
  const h = await sha256Hex('admin123');
  setAdminUser('admin', h);
  alert('Reset done. Login with admin / admin123 and change password.');
});

/* Export */
exportBtn?.addEventListener('click', () => {
  if (sessionStorage.getItem('isAdmin') !== 'true') { alert('Only admin can export'); return; }
  const parts = loadPartsFromLocal();
  const blob = new Blob([JSON.stringify(parts, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'part_export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* Parts UI & logic */
const tableBody = document.querySelector("#partsTable tbody");
const form = document.querySelector("#partForm");
const search = document.querySelector("#search");
const formTitle = document.getElementById('formTitle');
const saveBtn = document.getElementById('saveBtn');

let parts = []; // will be loaded

function isAdminLoggedIn() { return sessionStorage.getItem('isAdmin') === 'true'; }

function escapeHtml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getField(obj, key) {
  return obj[key] !== undefined ? obj[key] : '';
}

function renderTable(filter = "") {
  tableBody.innerHTML = "";
  const f = filter?.toLowerCase?.() || "";
  parts
    .map((p, i) => ({ p, i }))
    .filter(({p}) => {
      if (!f) return true;
      return Object.values(p).some(v => (v||'').toString().toLowerCase().includes(f));
    })
    .forEach(({p, i}) => {
      const canAct = isAdminLoggedIn();
      const actions = canAct 
        ? `<button class="btn btn-sm btn-warning me-1" onclick="editPart(${i})">Edit</button>
           <button class="btn btn-sm btn-danger" onclick="deletePart(${i})">Delete</button>`
        : `<small class="text-muted">admin only</small>`;
      const row = `<tr>
        <td>${escapeHtml(getField(p, 'Part no.'))}</td>
        <td>${escapeHtml(getField(p, 'Description'))}</td>
        <td>${escapeHtml(getField(p, 'Type'))}</td>
        <td>${escapeHtml(getField(p, 'Location'))}</td>
        <td>${escapeHtml(getField(p, 'ATA'))}</td>
        <td>${actions}</td>
      </tr>`;
      tableBody.innerHTML += row;
    });
  if (!isAdminLoggedIn()) {
    saveBtn.disabled = true;
    formTitle.innerText = 'Add / Edit Part (admin only)';
  } else {
    saveBtn.disabled = false;
    formTitle.innerText = 'Add / Edit Part';
  }
}

/* Form submit */
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!isAdminLoggedIn()) { alert('Only admin can add/edit parts'); return; }

  const newPart = {
    "Part no.": document.getElementById('partNumber').value.trim(),
    "Description": document.getElementById('description').value.trim(),
    "Type": document.getElementById('type').value.trim()
  };
  const loc = document.getElementById('location').value.trim();
  const ata = document.getElementById('ata').value.trim();
  if (loc) newPart["Location"] = loc;
  if (ata) newPart["ATA"] = isNaN(ata) ? ata : Number(ata);

  const editIndex = form.editIndex.value;
  const current = loadPartsFromLocal();
  if (editIndex) {
    current[editIndex] = newPart;
  } else {
    current.push(newPart);
  }

  savePartsToLocal(current);
  parts = current;
  form.reset();
  form.editIndex.value = "";
  renderTable(search.value);
});

window.editPart = function(i) {
  if (!isAdminLoggedIn()) { alert('Admin login required'); return; }
  const p = parts[i];
  document.getElementById('partNumber').value = getField(p, 'Part no.');
  document.getElementById('description').value = getField(p, 'Description');
  document.getElementById('type').value = getField(p, 'Type');
  document.getElementById('location').value = getField(p, 'Location');
  document.getElementById('ata').value = getField(p, 'ATA');
  form.editIndex.value = i;
};

window.deletePart = function(i) {
  if (!isAdminLoggedIn()) { alert('Admin login required'); return; }
  if (confirm('Delete this part?')) {
    const current = loadPartsFromLocal();
    current.splice(i, 1);
    savePartsToLocal(current);
    parts = current;
    renderTable(search.value);
  }
};

search.addEventListener("input", e => renderTable(e.target.value));

/* Initial load: try localStorage, else fetch part.json */
async function loadPartsData() {
  const stored = localStorage.getItem("parts");
  if (stored) {
    parts = JSON.parse(stored);
    renderTable();
    return;
  }

  try {
    const response = await fetch("part.json");
    if (!response.ok) throw new Error("part.json not found");
    parts = await response.json();
    savePartsToLocal(parts);
    renderTable();
  } catch (e) {
    console.error("Error loading part.json:", e);
    parts = [];
    renderTable();
  }
}

/* Start */
renderAuthArea();
loadPartsData();
