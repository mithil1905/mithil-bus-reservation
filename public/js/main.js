// public/js/main.js - Home Page & Live Booking Logic for Mithil Reservation Service

let allBuses = [];
let selectedBusForBooking = null;
let selectedSeats = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadCities();
  await searchBuses();
  setupEventListeners();
});

// Load Live Dashboard Counts
async function loadStats() {
  try {
    const res = await API.getStats();
    if (res.success) {
      document.getElementById('statBuses').innerText = res.data.total_buses;
      document.getElementById('statPassengers').innerText = res.data.total_passengers;
      document.getElementById('statBookings').innerText = res.data.total_bookings;
      document.getElementById('statRevenue').innerText = UI.formatINR(res.data.total_revenue);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// Populate Search City Dropdowns
async function loadCities() {
  try {
    const res = await API.getCities();
    if (res.success && res.cities) {
      const sourceSelect = document.getElementById('searchSource');
      const destSelect = document.getElementById('searchDestination');
      
      res.cities.forEach(city => {
        const opt1 = document.createElement('option');
        opt1.value = city;
        opt1.textContent = city;
        sourceSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = city;
        opt2.textContent = city;
        destSelect.appendChild(opt2);
      });
    }
  } catch (err) {
    console.error('Error loading cities:', err);
  }
}

// Search and Display Buses
async function searchBuses() {
  const source = document.getElementById('searchSource')?.value || '';
  const destination = document.getElementById('searchDestination')?.value || '';
  const bus_type = document.getElementById('searchBusType')?.value || '';

  const container = document.getElementById('busesListContainer');
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <p style="color: var(--saffron-primary); font-weight: 700;">🌸 Shubh Yatra: Searching available luxury coaches...</p>
    </div>
  `;

  try {
    const res = await API.getBuses({ source, destination, bus_type, status: 'Active' });
    allBuses = res.data || [];
    renderBusCards(allBuses);
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #dc2626;">
        <p>⚠️ Unable to load buses. Please verify MySQL connection.</p>
      </div>
    `;
  }
}

function renderBusCards(buses) {
  const container = document.getElementById('busesListContainer');
  if (buses.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <div style="font-size: 3rem; margin-bottom: 10px;">🚌</div>
        <h3 style="font-family: 'Cinzel', serif; color: var(--peacock-dark);">No Buses Found On This Route</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">Try selecting other cultural routes like Mumbai ➔ Goa, Delhi ➔ Jaipur, or Bengaluru ➔ Hyderabad.</p>
        <button class="btn btn-outline" style="margin-top: 16px;" onclick="resetSearch()">View All Available Fleets</button>
      </div>
    `;
    return;
  }

  container.innerHTML = buses.map(bus => `
    <div class="bus-card">
      <div class="bus-card-header">
        <div>
          <div class="bus-card-title">${bus.bus_name}</div>
          <span style="font-size: 0.78rem; opacity: 0.85;">${bus.bus_type}</span>
        </div>
        <span class="bus-plate">${bus.bus_number}</span>
      </div>
      <div class="bus-card-body">
        <div class="route-display">
          <div class="route-stop">
            <div class="route-city">${bus.source}</div>
            <div class="route-time">⏰ ${bus.departure_time}</div>
          </div>
          <div class="route-arrow">
            <span>DIRECT</span>
            <span>➔</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Express</span>
          </div>
          <div class="route-stop">
            <div class="route-city">${bus.destination}</div>
            <div class="route-time">🏁 ${bus.arrival_time}</div>
          </div>
        </div>

        <div class="bus-features">
          <span class="feature-pill">💺 Pushback Sleepers</span>
          <span class="feature-pill">❄️ Pure AC</span>
          <span class="feature-pill">🔌 Mobile Charging</span>
          <span class="feature-pill">💧 Water Bottle</span>
          <span class="feature-pill">📶 Free Wi-Fi</span>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Available Capacity: <strong>${bus.total_seats} Seats</strong></span>
          <span style="color: var(--emerald-green); font-weight: 700;">🟢 Fast Filling</span>
        </div>
      </div>
      <div class="bus-card-footer">
        <div>
          <div class="fare-amount">${UI.formatINR(bus.fare)} <span>/ seat</span></div>
          <span style="font-size: 0.72rem; color: var(--emerald-green); font-weight: 600;">Inclusive of GST & Tolls</span>
        </div>
        <button class="btn btn-primary" onclick="openBookingModal(${bus.bus_id})">
          <span>Book Now</span> <span>🪷</span>
        </button>
      </div>
    </div>
  `).join('');
}

function resetSearch() {
  document.getElementById('searchSource').value = '';
  document.getElementById('searchDestination').value = '';
  document.getElementById('searchBusType').value = '';
  searchBuses();
}

// Open Booking Modal for Selected Bus
async function openBookingModal(busId) {
  selectedBusForBooking = allBuses.find(b => b.bus_id === busId);
  if (!selectedBusForBooking) return;

  selectedSeats = [];
  document.getElementById('modalBusTitle').innerText = `${selectedBusForBooking.bus_name} (${selectedBusForBooking.bus_number})`;
  document.getElementById('modalRouteInfo').innerText = `${selectedBusForBooking.source} ➔ ${selectedBusForBooking.destination} | Dep: ${selectedBusForBooking.departure_time}`;
  document.getElementById('modalPerSeatFare').innerText = UI.formatINR(selectedBusForBooking.fare);

  // Set default journey date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('bookingJourneyDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('bookingJourneyDate').min = new Date().toISOString().split('T')[0];

  // Render Seat Grid (Indian Sleeper 2+1 layout preview)
  renderSeatGrid();
  updateFareCalculation();

  // Load Passengers Dropdown
  await loadPassengerDropdown();

  UI.openModal('bookTicketModal');
}

async function loadPassengerDropdown() {
  const select = document.getElementById('bookingPassengerSelect');
  select.innerHTML = '<option value="">-- Select Registered Passenger --</option>';
  try {
    const res = await API.getPassengers();
    if (res.success && res.data) {
      res.data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.passenger_id;
        opt.textContent = `${p.full_name} (${p.phone} - ${p.city})`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load passenger list:', err);
  }
}

function renderSeatGrid() {
  const grid = document.getElementById('interactiveSeatGrid');
  // Generate 18 Lower & Upper berths
  const seatPrefixes = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];
  
  // Randomly simulate 3 booked seats for realism
  const preBooked = ['L2', 'U4', 'U7'];

  grid.innerHTML = seatPrefixes.map(seat => {
    const isBooked = preBooked.includes(seat);
    return `
      <div class="seat-item ${isBooked ? 'booked' : ''}" 
           data-seat="${seat}" 
           onclick="${isBooked ? '' : `toggleSeatSelect('${seat}', this)`}">
        ${seat}
      </div>
    `;
  }).join('');
}

function toggleSeatSelect(seat, el) {
  if (selectedSeats.includes(seat)) {
    selectedSeats = selectedSeats.filter(s => s !== seat);
    el.classList.remove('selected');
  } else {
    selectedSeats.push(seat);
    el.classList.add('selected');
  }
  document.getElementById('selectedSeatsInput').value = selectedSeats.join(', ');
  updateFareCalculation();
}

function updateFareCalculation() {
  const seatCount = selectedSeats.length;
  document.getElementById('selectedSeatsCount').innerText = seatCount;
  if (selectedBusForBooking) {
    const total = seatCount * parseFloat(selectedBusForBooking.fare);
    document.getElementById('totalBookingFareDisplay').innerText = UI.formatINR(total);
  }
}

// Quick Add Passenger toggle
function toggleNewPassengerForm() {
  const form = document.getElementById('newPassengerQuickForm');
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';
}

function setupEventListeners() {
  // Search form submit
  document.getElementById('searchBusForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    searchBuses();
  });

  // Booking submit
  document.getElementById('confirmBookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let passengerId = document.getElementById('bookingPassengerSelect').value;

    // Check if user filled quick new passenger
    const quickName = document.getElementById('quickFullName')?.value;
    const quickPhone = document.getElementById('quickPhone')?.value;
    const quickEmail = document.getElementById('quickEmail')?.value;
    const quickCity = document.getElementById('quickCity')?.value;
    const quickAge = document.getElementById('quickAge')?.value;
    const quickGender = document.getElementById('quickGender')?.value;

    if (!passengerId && quickName && quickPhone) {
      // Create passenger on the fly
      try {
        const pRes = await API.createPassenger({
          full_name: quickName,
          phone: quickPhone,
          email: quickEmail || `${quickPhone}@mithilbus.in`,
          city: quickCity || 'India',
          age: parseInt(quickAge) || 28,
          gender: quickGender || 'Male',
          id_proof_type: 'Aadhaar Card',
          id_proof_number: 'XXXX-XXXX-XXXX'
        });

        if (pRes.success) {
          passengerId = pRes.passenger_id;
        } else {
          UI.showToast(pRes.message || 'Error creating passenger', 'error');
          return;
        }
      } catch (err) {
        UI.showToast('Failed to create passenger profile', 'error');
        return;
      }
    }

    if (!passengerId) {
      UI.showToast('Please select an existing passenger or fill passenger details!', 'error');
      return;
    }

    if (selectedSeats.length === 0) {
      UI.showToast('Please select at least one seat on the berth layout!', 'error');
      return;
    }

    const journeyDate = document.getElementById('bookingJourneyDate').value;
    const paymentStatus = document.getElementById('bookingPaymentMethod').value;
    const totalFare = selectedSeats.length * parseFloat(selectedBusForBooking.fare);

    try {
      const res = await API.createBooking({
        passenger_id: parseInt(passengerId),
        bus_id: selectedBusForBooking.bus_id,
        journey_date: journeyDate,
        seat_numbers: selectedSeats.join(', '),
        total_fare: totalFare,
        payment_status: paymentStatus,
        booking_status: 'Confirmed'
      });

      if (res.success) {
        UI.closeModal('bookTicketModal');
        UI.showToast(`✨ Shubh Yatra! Booking confirmed with PNR: ${res.pnr}`, 'success');
        await loadStats();
        
        // Show printable Indian E-Ticket
        showSuccessTicket(res.pnr);
      } else {
        UI.showToast(res.message || 'Booking failed', 'error');
      }
    } catch (err) {
      UI.showToast('Booking failed. Please try again.', 'error');
    }
  });
}

// Show Printable E-Ticket Dialog
async function showSuccessTicket(pnr) {
  try {
    const res = await API.getBooking(pnr);
    if (res.success && res.data) {
      const b = res.data;
      document.getElementById('ticketPnrDisplay').innerText = b.booking_pnr;
      document.getElementById('ticketPassengerName').innerText = b.passenger_name;
      document.getElementById('ticketPassengerPhone').innerText = b.passenger_phone;
      document.getElementById('ticketBusName').innerText = `${b.bus_name} (${b.bus_number})`;
      document.getElementById('ticketRoute').innerText = `${b.source} ➔ ${b.destination}`;
      document.getElementById('ticketTiming').innerText = `Departure: ${b.departure_time} | Arrival: ${b.arrival_time}`;
      document.getElementById('ticketJourneyDate').innerText = UI.formatDate(b.journey_date);
      document.getElementById('ticketSeats').innerText = b.seat_numbers;
      document.getElementById('ticketTotalFare').innerText = UI.formatINR(b.total_fare);
      document.getElementById('ticketPaymentMethod').innerText = b.payment_status;

      UI.openModal('ticketSuccessModal');
    }
  } catch (err) {
    console.error('Failed to load confirmed ticket:', err);
  }
}
