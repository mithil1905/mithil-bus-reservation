// server.js - Backend REST API Server for Mithil Reservation Service
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getPool, dbConfig } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to generate unique Indian Bus Booking PNR
function generatePNR() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `MBR-${randomNum}`;
}

// ==========================================================
// 1. DASHBOARD STATS & METADATA
// ==========================================================
app.get('/api/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const [[busCount]] = await pool.query('SELECT COUNT(*) AS total_buses FROM buses WHERE status = "Active"');
    const [[passengerCount]] = await pool.query('SELECT COUNT(*) AS total_passengers FROM passengers');
    const [[bookingCount]] = await pool.query('SELECT COUNT(*) AS total_bookings FROM bookings');
    const [[revenue]] = await pool.query('SELECT COALESCE(SUM(total_fare), 0) AS total_revenue FROM bookings WHERE booking_status = "Confirmed"');

    res.json({
      success: true,
      data: {
        total_buses: busCount.total_buses,
        total_passengers: passengerCount.total_passengers,
        total_bookings: bookingCount.total_bookings,
        total_revenue: parseFloat(revenue.total_revenue)
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
});

// Get unique sources and destinations
app.get('/api/cities', async (req, res) => {
  try {
    const pool = await getPool();
    const [sources] = await pool.query('SELECT DISTINCT source FROM buses ORDER BY source ASC');
    const [destinations] = await pool.query('SELECT DISTINCT destination FROM buses ORDER BY destination ASC');
    
    const citiesSet = new Set([
      ...sources.map(s => s.source),
      ...destinations.map(d => d.destination)
    ]);

    res.json({
      success: true,
      cities: Array.from(citiesSet).sort()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
});

// ==========================================================
// 2. BUSES CRUD API
// ==========================================================

// READ: Get all buses with optional filtering
app.get('/api/buses', async (req, res) => {
  try {
    const { source, destination, bus_type, status } = req.query;
    let query = 'SELECT * FROM buses WHERE 1=1';
    const params = [];

    if (source && source.trim() !== '') {
      query += ' AND LOWER(source) LIKE LOWER(?)';
      params.push(`%${source.trim()}%`);
    }
    if (destination && destination.trim() !== '') {
      query += ' AND LOWER(destination) LIKE LOWER(?)';
      params.push(`%${destination.trim()}%`);
    }
    if (bus_type && bus_type.trim() !== '') {
      query += ' AND bus_type = ?';
      params.push(bus_type.trim());
    }
    if (status && status.trim() !== '') {
      query += ' AND status = ?';
      params.push(status.trim());
    }

    query += ' ORDER BY bus_id DESC';

    const pool = await getPool();
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch buses', error: error.message });
  }
});

// READ: Get single bus by ID
app.get('/api/buses/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM buses WHERE bus_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bus', error: error.message });
  }
});

// CREATE: Add new bus
app.post('/api/buses', async (req, res) => {
  try {
    const { bus_name, bus_number, source, destination, departure_time, arrival_time, bus_type, total_seats, fare, status } = req.body;

    if (!bus_name || !bus_number || !source || !destination || !departure_time || !arrival_time || !fare) {
      return res.status(400).json({ success: false, message: 'All required bus fields must be provided' });
    }

    const pool = await getPool();
    
    // Check if bus number already exists
    const [existing] = await pool.query('SELECT bus_id FROM buses WHERE bus_number = ?', [bus_number.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A bus with this registration number already exists.' });
    }

    const [result] = await pool.query(`
      INSERT INTO buses (bus_name, bus_number, source, destination, departure_time, arrival_time, bus_type, total_seats, fare, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bus_name.trim(),
      bus_number.trim().toUpperCase(),
      source.trim(),
      destination.trim(),
      departure_time.trim(),
      arrival_time.trim(),
      bus_type || 'AC Sleeper (2+1)',
      parseInt(total_seats) || 36,
      parseFloat(fare),
      status || 'Active'
    ]);

    res.status(201).json({
      success: true,
      message: 'New bus added to Mithil Reservation fleet successfully!',
      bus_id: result.insertId
    });
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to create bus', error: error.message });
  }
});

// UPDATE: Update existing bus
app.put('/api/buses/:id', async (req, res) => {
  try {
    const { bus_name, bus_number, source, destination, departure_time, arrival_time, bus_type, total_seats, fare, status } = req.body;
    const pool = await getPool();

    // Check bus exists
    const [existing] = await pool.query('SELECT bus_id FROM buses WHERE bus_id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    // Check if bus_number clashes with another bus
    if (bus_number) {
      const [duplicate] = await pool.query('SELECT bus_id FROM buses WHERE bus_number = ? AND bus_id != ?', [bus_number.trim(), req.params.id]);
      if (duplicate.length > 0) {
        return res.status(400).json({ success: false, message: 'Another bus already uses this registration number.' });
      }
    }

    await pool.query(`
      UPDATE buses SET
        bus_name = COALESCE(?, bus_name),
        bus_number = COALESCE(?, bus_number),
        source = COALESCE(?, source),
        destination = COALESCE(?, destination),
        departure_time = COALESCE(?, departure_time),
        arrival_time = COALESCE(?, arrival_time),
        bus_type = COALESCE(?, bus_type),
        total_seats = COALESCE(?, total_seats),
        fare = COALESCE(?, fare),
        status = COALESCE(?, status)
      WHERE bus_id = ?
    `, [
      bus_name ? bus_name.trim() : null,
      bus_number ? bus_number.trim().toUpperCase() : null,
      source ? source.trim() : null,
      destination ? destination.trim() : null,
      departure_time ? departure_time.trim() : null,
      arrival_time ? arrival_time.trim() : null,
      bus_type ? bus_type.trim() : null,
      total_seats ? parseInt(total_seats) : null,
      fare ? parseFloat(fare) : null,
      status ? status.trim() : null,
      req.params.id
    ]);

    res.json({ success: true, message: 'Bus details updated successfully!' });
  } catch (error) {
    console.error('Update bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bus', error: error.message });
  }
});

// DELETE: Remove bus
app.delete('/api/buses/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM buses WHERE bus_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    res.json({ success: true, message: 'Bus removed from fleet successfully!' });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bus', error: error.message });
  }
});


// ==========================================================
// 3. PASSENGERS CRUD API
// ==========================================================

// READ: Get all passengers with optional search
app.get('/api/passengers', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM passengers WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      query += ' AND (LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR phone LIKE ? OR LOWER(city) LIKE LOWER(?))';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY passenger_id DESC';

    const pool = await getPool();
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Get passengers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch passengers', error: error.message });
  }
});

// READ: Get single passenger
app.get('/api/passengers/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM passengers WHERE passenger_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Passenger not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch passenger', error: error.message });
  }
});

// CREATE: Add new passenger
app.post('/api/passengers', async (req, res) => {
  try {
    const { full_name, email, phone, gender, age, id_proof_type, id_proof_number, city } = req.body;

    if (!full_name || !email || !phone || !gender || !age || !city) {
      return res.status(400).json({ success: false, message: 'Please provide full name, email, phone, gender, age, and city.' });
    }

    const pool = await getPool();
    const [result] = await pool.query(`
      INSERT INTO passengers (full_name, email, phone, gender, age, id_proof_type, id_proof_number, city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      full_name.trim(),
      email.trim(),
      phone.trim(),
      gender,
      parseInt(age),
      id_proof_type || 'Aadhaar Card',
      id_proof_number ? id_proof_number.trim() : 'XXXX-XXXX-XXXX',
      city.trim()
    ]);

    res.status(201).json({
      success: true,
      message: 'Passenger registered successfully!',
      passenger_id: result.insertId
    });
  } catch (error) {
    console.error('Create passenger error:', error);
    res.status(500).json({ success: false, message: 'Failed to create passenger', error: error.message });
  }
});

// UPDATE: Update passenger
app.put('/api/passengers/:id', async (req, res) => {
  try {
    const { full_name, email, phone, gender, age, id_proof_type, id_proof_number, city } = req.body;
    const pool = await getPool();

    const [existing] = await pool.query('SELECT passenger_id FROM passengers WHERE passenger_id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Passenger not found' });
    }

    await pool.query(`
      UPDATE passengers SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        gender = COALESCE(?, gender),
        age = COALESCE(?, age),
        id_proof_type = COALESCE(?, id_proof_type),
        id_proof_number = COALESCE(?, id_proof_number),
        city = COALESCE(?, city)
      WHERE passenger_id = ?
    `, [
      full_name ? full_name.trim() : null,
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      gender || null,
      age ? parseInt(age) : null,
      id_proof_type || null,
      id_proof_number ? id_proof_number.trim() : null,
      city ? city.trim() : null,
      req.params.id
    ]);

    res.json({ success: true, message: 'Passenger profile updated successfully!' });
  } catch (error) {
    console.error('Update passenger error:', error);
    res.status(500).json({ success: false, message: 'Failed to update passenger', error: error.message });
  }
});

// DELETE: Remove passenger
app.delete('/api/passengers/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM passengers WHERE passenger_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Passenger not found' });
    }
    res.json({ success: true, message: 'Passenger record removed successfully!' });
  } catch (error) {
    console.error('Delete passenger error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete passenger', error: error.message });
  }
});


// ==========================================================
// 4. BOOKINGS CRUD API (Joined with Passengers & Buses)
// ==========================================================

// READ: Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const { pnr, status } = req.query;
    let query = `
      SELECT 
        b.booking_id,
        b.booking_pnr,
        b.journey_date,
        b.seat_numbers,
        b.total_fare,
        b.payment_status,
        b.booking_status,
        b.booking_date,
        p.passenger_id,
        p.full_name AS passenger_name,
        p.email AS passenger_email,
        p.phone AS passenger_phone,
        p.city AS passenger_city,
        bs.bus_id,
        bs.bus_name,
        bs.bus_number,
        bs.source,
        bs.destination,
        bs.departure_time,
        bs.arrival_time,
        bs.bus_type
      FROM bookings b
      JOIN passengers p ON b.passenger_id = p.passenger_id
      JOIN buses bs ON b.bus_id = bs.bus_id
      WHERE 1=1
    `;
    const params = [];

    if (pnr && pnr.trim() !== '') {
      query += ' AND LOWER(b.booking_pnr) LIKE LOWER(?)';
      params.push(`%${pnr.trim()}%`);
    }
    if (status && status.trim() !== '') {
      query += ' AND b.booking_status = ?';
      params.push(status.trim());
    }

    query += ' ORDER BY b.booking_id DESC';

    const pool = await getPool();
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
  }
});

// READ: Get single booking (by ID or PNR)
app.get('/api/bookings/:identifier', async (req, res) => {
  try {
    const pool = await getPool();
    const identifier = req.params.identifier;
    const isNumeric = /^\d+$/.test(identifier);

    let query = `
      SELECT 
        b.booking_id,
        b.booking_pnr,
        b.journey_date,
        b.seat_numbers,
        b.total_fare,
        b.payment_status,
        b.booking_status,
        b.booking_date,
        p.passenger_id,
        p.full_name AS passenger_name,
        p.email AS passenger_email,
        p.phone AS passenger_phone,
        p.gender AS passenger_gender,
        p.age AS passenger_age,
        p.id_proof_type,
        p.id_proof_number,
        p.city AS passenger_city,
        bs.bus_id,
        bs.bus_name,
        bs.bus_number,
        bs.source,
        bs.destination,
        bs.departure_time,
        bs.arrival_time,
        bs.bus_type,
        bs.fare AS per_seat_fare
      FROM bookings b
      JOIN passengers p ON b.passenger_id = p.passenger_id
      JOIN buses bs ON b.bus_id = bs.bus_id
      WHERE ${isNumeric ? 'b.booking_id = ?' : 'b.booking_pnr = ?'}
    `;

    const [rows] = await pool.query(query, [identifier]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get single booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking', error: error.message });
  }
});

// CREATE: Book seats / Create reservation
app.post('/api/bookings', async (req, res) => {
  try {
    const { passenger_id, bus_id, journey_date, seat_numbers, total_fare, payment_status, booking_status } = req.body;

    if (!passenger_id || !bus_id || !journey_date || !seat_numbers) {
      return res.status(400).json({ success: false, message: 'passenger_id, bus_id, journey_date, and seat_numbers are required.' });
    }

    const pool = await getPool();

    // Verify Passenger
    const [passengers] = await pool.query('SELECT passenger_id, full_name FROM passengers WHERE passenger_id = ?', [passenger_id]);
    if (passengers.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected passenger does not exist.' });
    }

    // Verify Bus
    const [buses] = await pool.query('SELECT bus_id, fare, bus_name FROM buses WHERE bus_id = ?', [bus_id]);
    if (buses.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected bus does not exist.' });
    }

    // Calculate total fare if not provided
    let calculatedFare = parseFloat(total_fare);
    if (isNaN(calculatedFare) || calculatedFare <= 0) {
      const seatCount = seat_numbers.split(',').filter(s => s.trim().length > 0).length || 1;
      calculatedFare = parseFloat(buses[0].fare) * seatCount;
    }

    const pnr = generatePNR();

    const [result] = await pool.query(`
      INSERT INTO bookings (booking_pnr, passenger_id, bus_id, journey_date, seat_numbers, total_fare, payment_status, booking_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pnr,
      passenger_id,
      bus_id,
      journey_date,
      seat_numbers.trim(),
      calculatedFare,
      payment_status || 'Paid (UPI / GPay)',
      booking_status || 'Confirmed'
    ]);

    res.status(201).json({
      success: true,
      message: `Shubh Yatra! Reservation confirmed for ${passengers[0].full_name} on ${buses[0].bus_name}.`,
      booking_id: result.insertId,
      pnr: pnr
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  }
});

// UPDATE: Modify reservation
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { journey_date, seat_numbers, total_fare, payment_status, booking_status } = req.body;
    const pool = await getPool();

    const [existing] = await pool.query('SELECT booking_id FROM bookings WHERE booking_id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await pool.query(`
      UPDATE bookings SET
        journey_date = COALESCE(?, journey_date),
        seat_numbers = COALESCE(?, seat_numbers),
        total_fare = COALESCE(?, total_fare),
        payment_status = COALESCE(?, payment_status),
        booking_status = COALESCE(?, booking_status)
      WHERE booking_id = ?
    `, [
      journey_date || null,
      seat_numbers ? seat_numbers.trim() : null,
      total_fare ? parseFloat(total_fare) : null,
      payment_status || null,
      booking_status || null,
      req.params.id
    ]);

    res.json({ success: true, message: 'Reservation updated successfully!' });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking', error: error.message });
  }
});

// DELETE: Cancel / Delete reservation
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM bookings WHERE booking_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking cancelled and record removed successfully!' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete booking', error: error.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚌 Mithil Reservation Service - Server Running`);
  console.log(`📍 Web URL: http://localhost:${PORT}`);
  console.log(`🗄️ MySQL Database: ${dbConfig.database} (User: ${dbConfig.user})`);
  console.log(`====================================================`);
  // Initialize pool connection & tables
  try {
    await getPool();
  } catch (err) {
    console.error('Database connection notice:', err.message);
  }
});
