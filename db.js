// db.js - MySQL Connection Pool and Auto-Initialization for Mithil Reservation Service
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'mithil',
  database: process.env.DB_NAME || 'mithil_bus_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

let pool;

async function getPool() {
  if (!pool) {
    // First, ensure database exists
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConnection.end();

    // Create pool with target database
    pool = mysql.createPool(dbConfig);
    await initTables(pool);
  }
  return pool;
}

async function initTables(poolInstance) {
  try {
    // 1. Buses table
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS buses (
        bus_id INT AUTO_INCREMENT PRIMARY KEY,
        bus_name VARCHAR(100) NOT NULL,
        bus_number VARCHAR(50) NOT NULL UNIQUE,
        source VARCHAR(100) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        departure_time VARCHAR(20) NOT NULL,
        arrival_time VARCHAR(20) NOT NULL,
        bus_type VARCHAR(60) NOT NULL,
        total_seats INT NOT NULL DEFAULT 36,
        fare DECIMAL(10,2) NOT NULL,
        status ENUM('Active', 'Maintenance', 'Cancelled') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Passengers table
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS passengers (
        passenger_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        age INT NOT NULL,
        id_proof_type VARCHAR(50) DEFAULT 'Aadhaar Card',
        id_proof_number VARCHAR(50) DEFAULT 'XXXX-XXXX-XXXX',
        city VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Bookings table
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id INT AUTO_INCREMENT PRIMARY KEY,
        booking_pnr VARCHAR(30) NOT NULL UNIQUE,
        passenger_id INT NOT NULL,
        bus_id INT NOT NULL,
        journey_date DATE NOT NULL,
        seat_numbers VARCHAR(60) NOT NULL,
        total_fare DECIMAL(10,2) NOT NULL,
        payment_status ENUM('Paid (UPI / GPay)', 'Paid (NetBanking)', 'Paid (RuPay Card)', 'Pending', 'Failed') DEFAULT 'Paid (UPI / GPay)',
        booking_status ENUM('Confirmed', 'Waiting', 'Cancelled') DEFAULT 'Confirmed',
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) REFERENCES passengers (passenger_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_booking_bus FOREIGN KEY (bus_id) REFERENCES buses (bus_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if initial buses exist, if not insert seed data
    const [busRows] = await poolInstance.query('SELECT COUNT(*) AS count FROM buses');
    if (busRows[0].count === 0) {
      await poolInstance.query(`
        INSERT INTO buses (bus_name, bus_number, source, destination, departure_time, arrival_time, bus_type, total_seats, fare, status) VALUES
        ('Garuda Royal Sleeper', 'MH 12 AB 4589', 'Mumbai', 'Goa', '20:30', '07:30', 'Multi-Axle AC Sleeper (2+1)', 36, 1250.00, 'Active'),
        ('Rajdhani Heritage Express', 'DL 01 C 3210', 'Delhi', 'Jaipur', '06:00', '11:45', 'BharatBenz AC Semi-Sleeper', 40, 750.00, 'Active'),
        ('Kaveri Luxury Volvo', 'KA 01 F 7721', 'Bengaluru', 'Hyderabad', '21:00', '06:30', 'Volvo 9600 Multi-Axle AC Sleeper', 36, 1450.00, 'Active'),
        ('Kashi Vishwanath Yatra Special', 'UP 65 T 9022', 'Varanasi', 'Ayodhya', '08:00', '13:15', 'Executive AC Seater', 42, 550.00, 'Active'),
        ('Tirupati Balaji Darshan Superfast', 'TN 07 BE 8812', 'Chennai', 'Tirupati', '05:30', '09:45', 'Scania High-Deck AC Seater', 45, 620.00, 'Active'),
        ('Deccan Queen Sleeper', 'MH 14 CC 5001', 'Pune', 'Bengaluru', '19:00', '08:15', 'Multi-Axle AC Sleeper (2+1)', 36, 1600.00, 'Active');
      `);
    }

    const [passengerRows] = await poolInstance.query('SELECT COUNT(*) AS count FROM passengers');
    if (passengerRows[0].count === 0) {
      await poolInstance.query(`
        INSERT INTO passengers (full_name, email, phone, gender, age, id_proof_type, id_proof_number, city) VALUES
        ('Mithil Sharma', 'mithil.sharma@gmail.com', '9876543210', 'Male', 28, 'Aadhaar Card', '4582-9012-3456', 'Mumbai'),
        ('Aaradhya Patel', 'aaradhya.p@yahoo.in', '9822334455', 'Female', 26, 'PAN Card', 'ABCDE1234F', 'Ahmedabad'),
        ('Rajesh Kumar Verma', 'rajesh.verma@outlook.com', '9415012345', 'Male', 45, 'Aadhaar Card', '7890-1234-5678', 'Varanasi'),
        ('Deepika Sundaram', 'deepika.s@gmail.com', '9840198765', 'Female', 31, 'Voter ID', 'TN04199201', 'Chennai'),
        ('Vikramaditya Singh', 'vikram.singh@rediffmail.com', '9711223344', 'Male', 38, 'Passport', 'Z1234567', 'Jaipur');
      `);
    }

    const [bookingRows] = await poolInstance.query('SELECT COUNT(*) AS count FROM bookings');
    if (bookingRows[0].count === 0) {
      await poolInstance.query(`
        INSERT INTO bookings (booking_pnr, passenger_id, bus_id, journey_date, seat_numbers, total_fare, payment_status, booking_status) VALUES
        ('MBR-984210', 1, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'U4, U5', 2500.00, 'Paid (UPI / GPay)', 'Confirmed'),
        ('MBR-772190', 2, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'S12', 750.00, 'Paid (RuPay Card)', 'Confirmed'),
        ('MBR-651204', 3, 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'A07, A08', 1100.00, 'Paid (UPI / GPay)', 'Confirmed'),
        ('MBR-439011', 4, 5, DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'C15', 620.00, 'Paid (NetBanking)', 'Confirmed'),
        ('MBR-812379', 5, 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'L02', 1450.00, 'Paid (UPI / GPay)', 'Confirmed');
      `);
    }

    console.log('✅ MySQL Database & Tables initialized successfully.');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
  }
}

module.exports = {
  getPool,
  dbConfig
};
