// public/js/passengers.js - Passengers Directory CRUD Operations

let passengersList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadPassengersTable();
  setupPassengerFormHandlers();
});

async function loadPassengersTable() {
  const tableBody = document.getElementById('passengersTableBody');
  tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px;">Loading passengers directory...</td></tr>`;

  const search = document.getElementById('searchPassengerInput')?.value || '';

  try {
    const res = await API.getPassengers(search);
    passengersList = res.data || [];
    renderPassengersTable(passengersList);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Failed to load passengers from database.</td></tr>`;
  }
}

function renderPassengersTable(data) {
  const tableBody = document.getElementById('passengersTableBody');
  document.getElementById('passengersTotalCount').innerText = `${data.length} Registered Travelers`;

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No passenger profiles found. Click "Register New Passenger" to create one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(p => `
    <tr>
      <td><strong>#${p.passenger_id}</strong></td>
      <td>
        <div style="font-weight: 700; color: var(--peacock-dark);">${p.full_name}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${p.gender}, ${p.age} yrs</div>
      </td>
      <td>
        <div>📞 ${p.phone}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">✉️ ${p.email}</div>
      </td>
      <td>
        <span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
          ${p.id_proof_type}
        </span>
        <div style="font-size: 0.78rem; font-family: monospace; color: #475569; margin-top: 3px;">
          ${p.id_proof_number || 'Not provided'}
        </div>
      </td>
      <td><strong>${p.city}</strong></td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${UI.formatDate(p.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditPassengerModal(${p.passenger_id})" title="Edit Passenger Profile">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeletePassenger(${p.passenger_id}, '${p.full_name}')" title="Delete Record">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddPassengerModal() {
  document.getElementById('passengerModalTitle').innerText = 'Register New Passenger';
  document.getElementById('passengerForm').reset();
  document.getElementById('passengerFormId').value = '';
  UI.openModal('passengerModal');
}

function openEditPassengerModal(passengerId) {
  const p = passengersList.find(x => x.passenger_id === passengerId);
  if (!p) return;

  document.getElementById('passengerModalTitle').innerText = `Edit Passenger (#${p.passenger_id} - ${p.full_name})`;
  document.getElementById('passengerFormId').value = p.passenger_id;
  document.getElementById('passengerNameInput').value = p.full_name;
  document.getElementById('passengerEmailInput').value = p.email;
  document.getElementById('passengerPhoneInput').value = p.phone;
  document.getElementById('passengerGenderInput').value = p.gender;
  document.getElementById('passengerAgeInput').value = p.age;
  document.getElementById('passengerIdTypeInput').value = p.id_proof_type;
  document.getElementById('passengerIdNumberInput').value = p.id_proof_number;
  document.getElementById('passengerCityInput').value = p.city;

  UI.openModal('passengerModal');
}

async function confirmDeletePassenger(passengerId, name) {
  if (confirm(`Are you sure you want to delete passenger "${name}" (#${passengerId})? All bookings associated with this passenger will also be removed.`)) {
    try {
      const res = await API.deletePassenger(passengerId);
      if (res.success) {
        UI.showToast(`🗑️ ${res.message || 'Passenger deleted successfully'}`);
        await loadPassengersTable();
      } else {
        UI.showToast(res.message || 'Failed to delete passenger', 'error');
      }
    } catch (err) {
      UI.showToast('Server error while deleting passenger', 'error');
    }
  }
}

function setupPassengerFormHandlers() {
  document.getElementById('passengerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passengerId = document.getElementById('passengerFormId').value;
    const passengerData = {
      full_name: document.getElementById('passengerNameInput').value.trim(),
      email: document.getElementById('passengerEmailInput').value.trim(),
      phone: document.getElementById('passengerPhoneInput').value.trim(),
      gender: document.getElementById('passengerGenderInput').value,
      age: parseInt(document.getElementById('passengerAgeInput').value),
      id_proof_type: document.getElementById('passengerIdTypeInput').value,
      id_proof_number: document.getElementById('passengerIdNumberInput').value.trim(),
      city: document.getElementById('passengerCityInput').value.trim()
    };

    try {
      let res;
      if (passengerId) {
        res = await API.updatePassenger(passengerId, passengerData);
      } else {
        res = await API.createPassenger(passengerData);
      }

      if (res.success) {
        UI.closeModal('passengerModal');
        UI.showToast(res.message || 'Passenger saved successfully!', 'success');
        await loadPassengersTable();
      } else {
        UI.showToast(res.message || 'Error saving passenger', 'error');
      }
    } catch (err) {
      UI.showToast('Network / Server error occurred.', 'error');
    }
  });

  document.getElementById('searchPassengerInput')?.addEventListener('input', () => {
    loadPassengersTable();
  });
}
