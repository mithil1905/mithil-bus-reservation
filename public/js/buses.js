// public/js/buses.js - Buses Fleet Management CRUD Operations

let busesList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadBusesTable();
  setupBusFormHandlers();
});

async function loadBusesTable() {
  const tableBody = document.getElementById('busesTableBody');
  tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px;">Loading fleet data...</td></tr>`;

  const search = document.getElementById('filterBusInput')?.value || '';
  const status = document.getElementById('filterBusStatus')?.value || '';

  try {
    const res = await API.getBuses({ status });
    let data = res.data || [];
    
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(b => 
        b.bus_name.toLowerCase().includes(q) ||
        b.bus_number.toLowerCase().includes(q) ||
        b.source.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    }

    busesList = data;
    renderBusesTable(data);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Failed to load buses from database.</td></tr>`;
  }
}

function renderBusesTable(data) {
  const tableBody = document.getElementById('busesTableBody');
  document.getElementById('busesTotalCount').innerText = `${data.length} Buses in Fleet`;

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No buses match your criteria. Click "Add New Bus" to add one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(bus => {
    let statusClass = 'badge-active';
    if (bus.status === 'Maintenance') statusClass = 'badge-maintenance';
    if (bus.status === 'Cancelled') statusClass = 'badge-cancelled';

    return `
      <tr>
        <td><strong>#${bus.bus_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--peacock-dark);">${bus.bus_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${bus.bus_type}</div>
        </td>
        <td><span class="pnr-tag">${bus.bus_number}</span></td>
        <td>
          <div style="font-weight: 600;">${bus.source} ➔ ${bus.destination}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Dep: ${bus.departure_time} | Arr: ${bus.arrival_time}</div>
        </td>
        <td><strong>${bus.total_seats}</strong> Seats</td>
        <td><strong style="color: var(--saffron-primary);">${UI.formatINR(bus.fare)}</strong></td>
        <td><span class="badge ${statusClass}">${bus.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="openEditBusModal(${bus.bus_id})" title="Edit Bus Details">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteBus(${bus.bus_id}, '${bus.bus_name}')" title="Delete Bus">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddBusModal() {
  document.getElementById('busModalTitle').innerText = 'Add New Bus to Fleet';
  document.getElementById('busForm').reset();
  document.getElementById('busFormId').value = '';
  UI.openModal('busModal');
}

function openEditBusModal(busId) {
  const bus = busesList.find(b => b.bus_id === busId);
  if (!bus) return;

  document.getElementById('busModalTitle').innerText = `Edit Bus (#${bus.bus_id} - ${bus.bus_name})`;
  document.getElementById('busFormId').value = bus.bus_id;
  document.getElementById('busNameInput').value = bus.bus_name;
  document.getElementById('busNumberInput').value = bus.bus_number;
  document.getElementById('busSourceInput').value = bus.source;
  document.getElementById('busDestinationInput').value = bus.destination;
  document.getElementById('busDepTimeInput').value = bus.departure_time;
  document.getElementById('busArrTimeInput').value = bus.arrival_time;
  document.getElementById('busTypeInput').value = bus.bus_type;
  document.getElementById('busSeatsInput').value = bus.total_seats;
  document.getElementById('busFareInput').value = bus.fare;
  document.getElementById('busStatusInput').value = bus.status;

  UI.openModal('busModal');
}

async function confirmDeleteBus(busId, busName) {
  if (confirm(`Are you sure you want to remove bus "${busName}" (#${busId}) from the database? Any linked bookings will also be deleted.`)) {
    try {
      const res = await API.deleteBus(busId);
      if (res.success) {
        UI.showToast(`🗑️ ${res.message || 'Bus removed successfully'}`);
        await loadBusesTable();
      } else {
        UI.showToast(res.message || 'Failed to delete bus', 'error');
      }
    } catch (err) {
      UI.showToast('Server error while deleting bus', 'error');
    }
  }
}

function setupBusFormHandlers() {
  document.getElementById('busForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const busId = document.getElementById('busFormId').value;
    const busData = {
      bus_name: document.getElementById('busNameInput').value.trim(),
      bus_number: document.getElementById('busNumberInput').value.trim(),
      source: document.getElementById('busSourceInput').value.trim(),
      destination: document.getElementById('busDestinationInput').value.trim(),
      departure_time: document.getElementById('busDepTimeInput').value.trim(),
      arrival_time: document.getElementById('busArrTimeInput').value.trim(),
      bus_type: document.getElementById('busTypeInput').value.trim(),
      total_seats: parseInt(document.getElementById('busSeatsInput').value),
      fare: parseFloat(document.getElementById('busFareInput').value),
      status: document.getElementById('busStatusInput').value
    };

    try {
      let res;
      if (busId) {
        res = await API.updateBus(busId, busData);
      } else {
        res = await API.createBus(busData);
      }

      if (res.success) {
        UI.closeModal('busModal');
        UI.showToast(res.message || 'Bus saved successfully!', 'success');
        await loadBusesTable();
      } else {
        UI.showToast(res.message || 'Error saving bus', 'error');
      }
    } catch (err) {
      UI.showToast('Network / Server error occurred.', 'error');
    }
  });

  document.getElementById('filterBusInput')?.addEventListener('input', () => {
    loadBusesTable();
  });

  document.getElementById('filterBusStatus')?.addEventListener('change', () => {
    loadBusesTable();
  });
}
