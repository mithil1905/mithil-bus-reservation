-- ==========================================================
-- ONLINE BUS RESERVATION SYSTEM
-- Website Name: Mithil Reservation Service
-- Database Schema & Sample Seed Data
-- MySQL User: root | Password: mithil
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `mithil_bus_db` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `mithil_bus_db`;

-- Drop existing tables to allow clean re-import if needed
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `passengers`;
DROP TABLE IF EXISTS `buses`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------
-- 1. BUSES TABLE (Fleets across India)
-- ----------------------------------------------------------
CREATE TABLE `buses` (
  `bus_id` INT AUTO_INCREMENT PRIMARY KEY,
  `bus_name` VARCHAR(100) NOT NULL,
  `bus_number` VARCHAR(50) NOT NULL UNIQUE,
  `source` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `departure_time` VARCHAR(20) NOT NULL,
  `arrival_time` VARCHAR(20) NOT NULL,
  `bus_type` VARCHAR(60) NOT NULL,
  `total_seats` INT NOT NULL DEFAULT 36,
  `fare` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Active', 'Maintenance', 'Cancelled') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 2. PASSENGERS TABLE (Indian Travelers Directory)
-- ----------------------------------------------------------
CREATE TABLE `passengers` (
  `passenger_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `age` INT NOT NULL,
  `id_proof_type` VARCHAR(50) DEFAULT 'Aadhaar Card',
  `id_proof_number` VARCHAR(50) DEFAULT 'XXXX-XXXX-XXXX',
  `city` VARCHAR(80) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 3. BOOKINGS TABLE (Reservation & PNR Records)
-- ----------------------------------------------------------
CREATE TABLE `bookings` (
  `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_pnr` VARCHAR(30) NOT NULL UNIQUE,
  `passenger_id` INT NOT NULL,
  `bus_id` INT NOT NULL,
  `journey_date` DATE NOT NULL,
  `seat_numbers` VARCHAR(60) NOT NULL,
  `total_fare` DECIMAL(10,2) NOT NULL,
  `payment_status` ENUM('Paid (UPI / GPay)', 'Paid (NetBanking)', 'Paid (RuPay Card)', 'Pending', 'Failed') DEFAULT 'Paid (UPI / GPay)',
  `booking_status` ENUM('Confirmed', 'Waiting', 'Cancelled') DEFAULT 'Confirmed',
  `booking_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_booking_passenger` FOREIGN KEY (`passenger_id`) REFERENCES `passengers` (`passenger_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`bus_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- SEED DATA: Realistic Indian Routes, Travelers, and Bookings
-- ==========================================================

-- Seed Buses
INSERT INTO `buses` (`bus_id`, `bus_name`, `bus_number`, `source`, `destination`, `departure_time`, `arrival_time`, `bus_type`, `total_seats`, `fare`, `status`) VALUES
(1, 'Garuda Royal Sleeper', 'MH 12 AB 4589', 'Mumbai', 'Goa', '20:30', '07:30', 'Multi-Axle AC Sleeper (2+1)', 36, 1250.00, 'Active'),
(2, 'Rajdhani Heritage Express', 'DL 01 C 3210', 'Delhi', 'Jaipur', '06:00', '11:45', 'BharatBenz AC Semi-Sleeper', 40, 750.00, 'Active'),
(3, 'Kaveri Luxury Volvo', 'KA 01 F 7721', 'Bengaluru', 'Hyderabad', '21:00', '06:30', 'Volvo 9600 Multi-Axle AC Sleeper', 36, 1450.00, 'Active'),
(4, 'Kashi Vishwanath Yatra Special', 'UP 65 T 9022', 'Varanasi', 'Ayodhya', '08:00', '13:15', 'Executive AC Seater', 42, 550.00, 'Active'),
(5, 'Tirupati Balaji Darshan Superfast', 'TN 07 BE 8812', 'Chennai', 'Tirupati', '05:30', '09:45', 'Scania High-Deck AC Seater', 45, 620.00, 'Active'),
(6, 'Deccan Queen Sleeper', 'MH 14 CC 5001', 'Pune', 'Bengaluru', '19:00', '08:15', 'Multi-Axle AC Sleeper (2+1)', 36, 1600.00, 'Active');

-- Seed Passengers
INSERT INTO `passengers` (`passenger_id`, `full_name`, `email`, `phone`, `gender`, `age`, `id_proof_type`, `id_proof_number`, `city`) VALUES
(1, 'Mithil Sharma', 'mithil.sharma@gmail.com', '9876543210', 'Male', 28, 'Aadhaar Card', '4582-9012-3456', 'Mumbai'),
(2, 'Aaradhya Patel', 'aaradhya.p@yahoo.in', '9822334455', 'Female', 26, 'PAN Card', 'ABCDE1234F', 'Ahmedabad'),
(3, 'Rajesh Kumar Verma', 'rajesh.verma@outlook.com', '9415012345', 'Male', 45, 'Aadhaar Card', '7890-1234-5678', 'Varanasi'),
(4, 'Deepika Sundaram', 'deepika.s@gmail.com', '9840198765', 'Female', 31, 'Voter ID', 'TN04199201', 'Chennai'),
(5, 'Vikramaditya Singh', 'vikram.singh@rediffmail.com', '9711223344', 'Male', 38, 'Passport', 'Z1234567', 'Jaipur');

-- Seed Bookings
INSERT INTO `bookings` (`booking_id`, `booking_pnr`, `passenger_id`, `bus_id`, `journey_date`, `seat_numbers`, `total_fare`, `payment_status`, `booking_status`) VALUES
(1, 'MBR-984210', 1, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'U4, U5', 2500.00, 'Paid (UPI / GPay)', 'Confirmed'),
(2, 'MBR-772190', 2, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'S12', 750.00, 'Paid (RuPay Card)', 'Confirmed'),
(3, 'MBR-651204', 3, 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'A07, A08', 1100.00, 'Paid (UPI / GPay)', 'Confirmed'),
(4, 'MBR-439011', 4, 5, DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'C15', 620.00, 'Paid (NetBanking)', 'Confirmed'),
(5, 'MBR-812379', 5, 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'L02', 1450.00, 'Paid (UPI / GPay)', 'Confirmed');
