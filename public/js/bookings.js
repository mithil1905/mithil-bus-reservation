// public/js/bookings.js - Bookings & Reservations Management CRUD Operations

let bookingsList = [];
let availableBuses = [];
let availablePassengers = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadMetadata();
  await loadBookingsTable();
  setupBookingFormHandlers();
});

async function loadMetadata() {
  try {
    const [bRes, pRes] = await Promise.all([
      API.getBuses({ status: 'Active' }),
      API.getPassengers()
    ]);
    availableBuses = bRes.data || [];
    availablePassengers = pRes.data || [];
    populateSelectDropdowns();
  } catch (err) {
    console.error('Error loading metadata:', err);
  }
}

function populateSelectDropdowns() {
  const pSelect = document.getElementById('bookingPassengerSelect');
  if (pSelect) {
    pSelect.innerHTML = '<option value="">-- Choose Passenger --</option>' +
      availablePassengers.map(p => `<option value="${p.passenger_id}">${p.full_name} (${p.phone} - ${p.city})</option>`).join('');
  }

  const bSelect = document.getElementById('bookingBusSelect');
  if (bSelect) {
    bSelect.innerHTML = '<option value="">-- Choose Bus Route --</option>' +
      availableBuses.map(b => `<option value="${b.bus_id}" data-fare="${b.fare}">${b.bus_name} (${b.source} ➔ ${b.destination}) - ${UI.formatINR(b.fare)}/seat</option>`).join('');
  }
}

async function loadBookingsTable() {
  const tableBody = document.getElementById('bookingsTableBody');
  tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px;">Loading bookings and PNR records...</td></tr>`;

  const pnr = document.getElementById('filterPnrInput')?.value || '';
  const status = document.getElementById('filterBookingStatus')?.value || '';

  try {
    const res = await API.getBookings({ pnr, status });
    bookingsList = res.data || [];
    renderBookingsTable(bookingsList);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Failed to load bookings from database.</td></tr>`;
  }
}

function renderBookingsTable(data) {
  const tableBody = document.getElementById('bookingsTableBody');
  document.getElementById('bookingsTotalCount').innerText = `${data.length} Confirmed Bookings`;

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">No booking records found. Click "Create New Reservation" to issue a ticket.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(b => {
    let statusClass = 'badge-confirmed';
    if (b.booking_status === 'Waiting') statusClass = 'badge-waiting';
    if (b.booking_status === 'Cancelled') statusClass = 'badge-cancelled';

    return `
      <tr>
        <td>
          <span class="pnr-tag">${b.booking_pnr}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--peacock-dark);">${b.passenger_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">📞 ${b.passenger_phone}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${b.bus_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${b.source} ➔ ${b.destination}</div>
        </td>
        <td><strong>${UI.formatDate(b.journey_date)}</strong></td>
        <td><span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">${b.seat_numbers}</span></td>
        <td><strong style="color: var(--saffron-primary);">${UI.formatINR(b.total_fare)}</strong></td>
        <td><span style="font-size: 0.8rem; color: #047857; font-weight: 600;">${b.payment_status}</span></td>
        <td><span class="badge ${statusClass}">${b.booking_status}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="viewTicketModal('${b.booking_pnr}')" title="Print / View E-Ticket">🎫 Ticket</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditBookingModal(${b.booking_id})" title="Edit Reservation">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteBooking(${b.booking_id}, '${b.booking_pnr}')" title="Cancel Reservation">🗑️ Cancel</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddBookingModal() {
  document.getElementById('bookingModalTitle').innerText = 'Create New Bus Reservation';
  document.getElementById('bookingForm').reset();
  document.getElementById('bookingFormId').value = '';
  document.getElementById('modalPassengerBusGroup').style.display = 'grid';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('bookingJourneyDateInput').value = tomorrow.toISOString().split('T')[0];

  UI.openModal('bookingModal');
}

function openEditBookingModal(bookingId) {
  const b = bookingsList.find(x => x.booking_id === bookingId);
  if (!b) return;

  document.getElementById('bookingModalTitle').innerText = `Edit Booking (PNR: ${b.booking_pnr})`;
  document.getElementById('bookingFormId').value = b.booking_id;
  
  // In edit mode, passenger and bus are locked to avoid accidental re-routing
  document.getElementById('modalPassengerBusGroup').style.display = 'none';

  document.getElementById('bookingJourneyDateInput').value = b.journey_date;
  document.getElementById('bookingSeatsInput').value = b.seat_numbers;
  document.getElementById('bookingFareInput').value = b.total_fare;
  document.getElementById('bookingPaymentStatusInput').value = b.payment_status;
  document.getElementById('bookingStatusInput').value = b.booking_status;

  UI.openModal('bookingModal');
}

async function confirmDeleteBooking(bookingId, pnr) {
  if (confirm(`Are you sure you want to cancel and delete Booking PNR ${pnr}? This will release the seats immediately.`)) {
    try {
      const res = await API.deleteBooking(bookingId);
      if (res.success) {
        UI.showToast(`🗑️ ${res.message || 'Booking cancelled successfully'}`);
        await loadBookingsTable();
      } else {
        UI.showToast(res.message || 'Failed to cancel booking', 'error');
      }
    } catch (err) {
      UI.showToast('Server error while cancelling booking', 'error');
    }
  }
}

async function viewTicketModal(pnr) {
  try {
    const res = await API.getBooking(pnr);
    if (res.success && res.data) {
      const b = res.data;
      document.getElementById('tPnr').innerText = b.booking_pnr;
      document.getElementById('tPassengerName').innerText = b.passenger_name;
      document.getElementById('tPassengerContact').innerText = `${b.passenger_phone} | ${b.passenger_email}`;
      document.getElementById('tBusInfo').innerText = `${b.bus_name} (${b.bus_number})`;
      document.getElementById('tRoute').innerText = `${b.source} ➔ ${b.destination}`;
      document.getElementById('tDeparture').innerText = `${b.departure_time} (Arrival: ${b.arrival_time})`;
      document.getElementById('tJourneyDate').innerText = UI.formatDate(b.journey_date);
      document.getElementById('tSeats').innerText = b.seat_numbers;
      document.getElementById('tFare').innerText = UI.formatINR(b.total_fare);
      document.getElementById('tPaymentStatus').innerText = b.payment_status;
      document.getElementById('tBookingStatus').innerText = b.booking_status;

      UI.openModal('eTicketModal');
    }
  } catch (err) {
    UI.showToast('Failed to load ticket details', 'error');
  }
}

function printTicket() {
  window.print();
}

function setupBookingFormHandlers() {
  // Auto-calculate fare when bus or seats change in Add Modal
  const busSelect = document.getElementById('bookingBusSelect');
  const seatsInput = document.getElementById('bookingSeatsInput');
  const fareInput = document.getElementById('bookingFareInput');

  function calculateFare() {
    const isCreate = !document.getElementById('bookingFormId').value;
    if (isCreate && busSelect) {
      const selectedOption = busSelect.options[busSelect.selectedIndex];
      const farePerSeat = parseFloat(selectedOption?.dataset?.fare || 0);
      const seats = seatsInput.value.split(',').filter(s => s.trim().length > 0).length || 1;
      if (farePerSeat > 0) {
        fareInput.value = (farePerSeat * seats).toFixed(2);
      }
    }
  }

  busSelect?.addEventListener('change', calculateFare);
  seatsInput?.addEventListener('input', calculateFare);

  document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookingId = document.getElementById('bookingFormId').value;

    if (bookingId) {
      // UPDATE
      const updateData = {
        journey_date: document.getElementById('bookingJourneyDateInput').value,
        seat_numbers: document.getElementById('bookingSeatsInput').value.trim(),
        total_fare: parseFloat(document.getElementById('bookingFareInput').value),
        payment_status: document.getElementById('bookingPaymentStatusInput').value,
        booking_status: document.getElementById('bookingStatusInput').value
      };

      try {
        const res = await API.updateBooking(bookingId, updateData);
        if (res.success) {
          UI.closeModal('bookingModal');
          UI.showToast(res.message || 'Reservation updated!', 'success');
          await loadBookingsTable();
        } else {
          UI.showToast(res.message || 'Error updating reservation', 'error');
        }
      } catch (err) {
        UI.showToast('Network error updating booking', 'error');
      }
    } else {
      // CREATE
      const passengerId = document.getElementById('bookingPassengerSelect').value;
      const busId = document.getElementById('bookingBusSelect').value;

      if (!passengerId || !busId) {
        UI.showToast('Please select both a passenger and a bus route.', 'error');
        return;
      }

      const createData = {
        passenger_id: parseInt(passengerId),
        bus_id: parseInt(busId),
        journey_date: document.getElementById('bookingJourneyDateInput').value,
        seat_numbers: document.getElementById('bookingSeatsInput').value.trim(),
        total_fare: parseFloat(document.getElementById('bookingFareInput').value),
        payment_status: document.getElementById('bookingPaymentStatusInput').value,
        booking_status: document.getElementById('bookingStatusInput').value
      };

      try {
        const res = await API.createBooking(createData);
        if (res.success) {
          UI.closeModal('bookingModal');
          UI.showToast(`✨ Reservation created! PNR: ${res.pnr}`, 'success');
          await loadBookingsTable();
          viewTicketModal(res.pnr);
        } else {
          UI.showToast(res.message || 'Error creating reservation', 'error');
        }
      } catch (err) {
        UI.showToast('Network error creating booking', 'error');
      }
    }
  });

  document.getElementById('filterPnrInput')?.addEventListener('input', () => {
    loadBookingsTable();
  });

  document.getElementById('filterBookingStatus')?.addEventListener('change', () => {
    loadBookingsTable();
  });
}
