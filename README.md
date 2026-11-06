# 🪷 Mithil Reservation Service - Online Bus Reservation System

An authentic, production-ready **Online Bus Reservation System** deeply rooted in **Indian Cultural Heritage** ("Atithi Devo Bhava" & "Shubh Yatra"). Built with HTML5, Vanilla CSS, JavaScript, Node.js (Express), and MySQL.

---

## 🌟 Key Highlights & Features

1. **Website Name**: **Mithil Reservation Service**
2. **Indian Cultural Heritage**:
   - Palette inspired by auspicious Indian marigold/saffron (`#ff9933`), royal peacock blue (`#0a192f`), and shubh emerald.
   - Traditional Indian blessings (*"सर्वे भवन्तु सुखिनः"*, *"अतिथि देवो भव"*).
   - Real pilgrimage and heritage corridors (Mumbai ➔ Goa, Delhi ➔ Jaipur, Bengaluru ➔ Hyderabad, Varanasi ➔ Ayodhya, Chennai ➔ Tirupati).
   - Dedicated high-resolution culturally-rich image on **every single HTML page**.
3. **Full CRUD Operations (Create, Read, Update, Delete)**:
   - **Buses Management**: Add new luxury coach, view fleet, update schedules/fares, remove bus.
   - **Passengers Directory**: Register travelers with Indian ID proofs (Aadhaar, PAN, Voter ID, Passport), edit contact data, delete records.
   - **Bookings & PNR System**: Reserve seats with auto-generated PNRs (`MBR-XXXXXX`), modify seats/dates/payment, cancel bookings.
4. **Interactive Berth Picker & E-Ticket**:
   - Interactive Indian sleeper berth layout (Lower & Upper berths).
   - Printable Official Electronic Reservation Slip (ERS) with PNR and security badge.
5. **MySQL Database Integration**:
   - Database: `mithil_bus_db`
   - User: `root`
   - Password: `mithil`
   - 3 Tables: `buses`, `passengers`, `bookings` with foreign key relationships.

---

## 📁 Project Structure

```
d:\Mithil Bus Reservation\
│
├── database.sql               # Complete SQL schema & realistic Indian seed data
├── db.js                      # MySQL pool connection & auto-table creator
├── server.js                  # Express REST API backend with full CRUD endpoints
├── package.json               # Node.js dependencies (express, mysql2, cors)
├── README.md                  # Project documentation & execution guide
│
└── public/                    # Frontend Web Assets
    ├── index.html             # Home Page: Live search, bus listings & instant seat booking
    ├── buses.html             # Buses CRUD Management Page
    ├── passengers.html        # Passengers CRUD Directory Page
    ├── bookings.html          # Bookings CRUD & PNR Management Page
    ├── about.html             # About Us & Indian Cultural Heritage Page
    │
    ├── css/
    │   └── style.css          # Master CSS design system with Indian cultural themes
    │
    ├── js/
    │   ├── api.js             # Unified API client, Indian Rupee formatting, Modals & Toast
    │   ├── main.js            # Home page search & interactive berth selector
    │   ├── buses.js           # Buses CRUD controller
    │   ├── passengers.js      # Passengers CRUD controller
    │   └── bookings.js        # Bookings CRUD controller & E-Ticket printer
    │
    └── images/                # High-Resolution Page Images
        ├── hero_bus.jpg       # Home Page: Indian luxury sleeper bus with marigold garland
        ├── buses_fleet.jpg    # Buses Page: Grand lineup of luxury coaches in heritage court
        ├── passengers.jpg     # Passengers Page: Indian travelers & families
        ├── ticket_booking.jpg # Bookings Page: Reservation slip & travel suitcase
        └── cultural_heritage.jpg # About Page: Ancient Indian architecture & cultural landmark
```

---

## 🚀 How to Run the Project

### 1. Prerequisites
- **Node.js** (v18 or higher installed)
- **MySQL Server** running on `localhost:3306` with password `mithil` for user `root`.

### 2. Quick Start
From the project folder `d:\Mithil Bus Reservation`:

```powershell
# 1. Install dependencies
npm install

# 2. (Optional) Initialize the database without starting the server
npm run init-db

# 3. Start the Server (also initializes the database automatically)
npm start
```

### 3. Open in Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🗄️ MySQL Database Schema & Password

- **MySQL User**: `root`
- **MySQL Password**: `mithil`
- **Database**: `mithil_bus_db`

### Tables:
1. `buses`:
   - `bus_id` (INT, PK, AUTO_INCREMENT)
   - `bus_name` (VARCHAR)
   - `bus_number` (VARCHAR, UNIQUE)
   - `source` (VARCHAR)
   - `destination` (VARCHAR)
   - `departure_time` (VARCHAR)
   - `arrival_time` (VARCHAR)
   - `bus_type` (VARCHAR)
   - `total_seats` (INT)
   - `fare` (DECIMAL)
   - `status` (ENUM: 'Active', 'Maintenance', 'Cancelled')

2. `passengers`:
   - `passenger_id` (INT, PK, AUTO_INCREMENT)
   - `full_name` (VARCHAR)
   - `email` (VARCHAR)
   - `phone` (VARCHAR)
   - `gender` (ENUM: 'Male', 'Female', 'Other')
   - `age` (INT)
   - `id_proof_type` (VARCHAR)
   - `id_proof_number` (VARCHAR)
   - `city` (VARCHAR)

3. `bookings`:
   - `booking_id` (INT, PK, AUTO_INCREMENT)
   - `booking_pnr` (VARCHAR, UNIQUE)
   - `passenger_id` (INT, FK -> passengers.passenger_id)
   - `bus_id` (INT, FK -> buses.bus_id)
   - `journey_date` (DATE)
   - `seat_numbers` (VARCHAR)
   - `total_fare` (DECIMAL)
   - `payment_status` (ENUM)
   - `booking_status` (ENUM: 'Confirmed', 'Waiting', 'Cancelled')

---

## 🌐 REST API Endpoints

| Entity | Method | Endpoint | Description |
|---|---|---|---|
| **Stats** | `GET` | `/api/stats` | Dashboard counts & total revenue |
| **Buses** | `GET` | `/api/buses` | Get all buses (filter by source, dest, class) |
| | `POST` | `/api/buses` | Add new bus to fleet |
| | `PUT` | `/api/buses/:id` | Update bus details |
| | `DELETE` | `/api/buses/:id` | Remove bus from fleet |
| **Passengers** | `GET` | `/api/passengers` | Get all passengers / search |
| | `POST` | `/api/passengers` | Register new passenger profile |
| | `PUT` | `/api/passengers/:id` | Update passenger information |
| | `DELETE` | `/api/passengers/:id` | Remove passenger record |
| **Bookings** | `GET` | `/api/bookings` | Get all reservations joined with details |
| | `GET` | `/api/bookings/:pnr` | Get ticket details by PNR or ID |
| | `POST` | `/api/bookings` | Create new reservation & generate PNR |
| | `PUT` | `/api/bookings/:id` | Update booking seats / date / status |
| | `DELETE` | `/api/bookings/:id` | Cancel reservation |
