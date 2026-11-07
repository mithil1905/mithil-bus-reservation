// public/js/api.js - Mithil Reservation Service Unified API Helper

const API_BASE = '/api';

const API = {
  // Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    return await res.json();
  },

  // Cities
  async getCities() {
    const res = await fetch(`${API_BASE}/cities`);
    return await res.json();
  },

  // Buses CRUD
  async getBuses(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/buses?${params.toString()}`);
    return await res.json();
  },

  async getBusById(id) {
    const res = await fetch(`${API_BASE}/buses/${id}`);
    return await res.json();
  },

  async createBus(busData) {
    const res = await fetch(`${API_BASE}/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(busData)
    });
    return await res.json();
  },

  async updateBus(id, busData) {
    const res = await fetch(`${API_BASE}/buses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(busData)
    });
    return await res.json();
  },

  async deleteBus(id) {
    const res = await fetch(`${API_BASE}/buses/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // Passengers CRUD
  async getPassengers(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/passengers${params}`);
    return await res.json();
  },

  async getPassengerById(id) {
    const res = await fetch(`${API_BASE}/passengers/${id}`);
    return await res.json();
  },

  async createPassenger(passengerData) {
    const res = await fetch(`${API_BASE}/passengers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passengerData)
    });
    return await res.json();
  },

  async updatePassenger(id, passengerData) {
    const res = await fetch(`${API_BASE}/passengers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passengerData)
    });
    return await res.json();
  },

  async deletePassenger(id) {
    const res = await fetch(`${API_BASE}/passengers/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // Bookings CRUD
  async getBookings(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/bookings?${params.toString()}`);
    return await res.json();
  },

  async getBooking(identifier) {
    const res = await fetch(`${API_BASE}/bookings/${identifier}`);
    return await res.json();
  },

  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return await res.json();
  },

  async updateBooking(id, bookingData) {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return await res.json();
  },

  async deleteBooking(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }
};

// UI Helpers
const UI = {
  formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '✨';
    if (type === 'success') icon = '🪷';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
};

// Close modal on escape or clicking outside
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
