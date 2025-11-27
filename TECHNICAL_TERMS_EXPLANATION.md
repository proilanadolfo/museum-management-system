# 📚 Mga Technical Terms ug ilang Meaning sa atong Museum Management System

## 🎯 Overview
Kini nga dokumento nag-explain sa mga technical terms nga gigamit sa atong codebase ug kung giunsa sila na-apply sa atong project.

---

## 1. 🔙 BACKEND (Server-Side)

### Unsa ang Backend?
Ang **Backend** mao ang bahin sa sistema nga nagdagan sa **server** (computer nga nag-host sa application). Kini ang nag-handle sa:
- Database operations (pag-save, pag-read, pag-update, pag-delete sa data)
- Business logic (mga rules ug calculations)
- Authentication ug security
- API endpoints (mga pultahan para sa frontend makakonek)

### Sa atong Project:
- **Location**: `backend/` folder
- **Main File**: `backend/index.js` - mao ni ang entry point
- **Technology**: Node.js + Express.js
- **Port**: 5000 (http://localhost:5000)

### Example sa atong Backend:
```javascript
// backend/index.js
const express = require('express')
const app = express()
const PORT = 5000

// API endpoint para sa bookings
app.get('/api/bookings', (req, res) => {
  // Logic dinhi para makuha ang bookings gikan sa database
})

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
```

**Sa simple terms**: Ang backend mao ang "kuta" nga nag-proseso sa tanan nga requests gikan sa frontend ug nag-interact sa database.

---

## 2. 🗄️ MONGODB (Database)

### Unsa ang MongoDB?
Ang **MongoDB** usa ka **NoSQL database** nga nag-store sa data sa format nga **JSON-like documents**. Dili parehas sa traditional databases nga naggamit ug tables ug rows.

### Unsa ang NoSQL?
**NoSQL** = "Not Only SQL" o "Non-SQL"
- **SQL databases** (MySQL, PostgreSQL): Structured data, fixed tables
- **NoSQL databases** (MongoDB): Flexible structure, document-based

### Ngano NoSQL ang MongoDB?
1. **Flexible Schema**: Pwede mag-add ug fields anytime
2. **JSON-like Format**: Mas sayon para sa JavaScript developers
3. **Scalable**: Pwede mag-handle ug daghan data
4. **Fast**: Maayo para sa real-time applications

### Sa atong Project:
- **Location**: `backend/db.js` - connection configuration
- **3 ka Databases**:
  1. `museum_admin` - para sa admin users
  2. `museum_superadmin` - para sa super admin users
  3. `museum_bookings` - para sa bookings data

### Example sa atong MongoDB Connection:
```javascript
// backend/db.js
const mongoose = require('mongoose')

// Connection sa admin database
const ADMIN_URI = 'mongodb://127.0.0.1:27017/museum_admin'
const adminConnection = mongoose.createConnection(ADMIN_URI)
```

### Example sa MongoDB Document (Data Structure):
```javascript
// Sample booking document sa MongoDB
{
  "_id": "507f1f77bcf86cd799439011",
  "fullName": "Juan Dela Cruz",
  "email": "juan@example.com",
  "visitDate": "2024-12-25",
  "numberOfVisitors": 5,
  "status": "confirmed",
  "createdAt": "2024-12-20T10:30:00Z"
}
```

**Sa simple terms**: Ang MongoDB mao ang "storage room" nga nag-keep sa tanan nga data (users, bookings, announcements, etc.) sa format nga similar sa JSON.

---

## 3. 🟢 NODE.JS (Runtime Environment)

### Unsa ang Node.js?
Ang **Node.js** usa ka **JavaScript runtime** nga nagpa-dagan sa JavaScript code **sa server-side** (dili sa browser). Kini nag-allow sa JavaScript nga mag-run sa computer mismo, dili lang sa web browser.

### Ngano Node.js?
1. **Same Language**: JavaScript para sa frontend ug backend
2. **Fast**: Built on Chrome's V8 engine
3. **Non-blocking**: Pwede mag-handle ug multiple requests simultaneously
4. **Rich Ecosystem**: Daghan kaayo packages (npm)

### Sa atong Project:
- **Entry Point**: `backend/index.js`
- **Package Manager**: npm (Node Package Manager)
- **Dependencies**: Tanan naa sa `backend/package.json`

### Example sa Node.js Code:
```javascript
// backend/index.js
const express = require('express')  // Import Express framework
const mongoose = require('mongoose') // Import Mongoose (MongoDB driver)

// Create Express app
const app = express()

// Start server
app.listen(5000, () => {
  console.log('Server running on port 5000')
})
```

**Sa simple terms**: Ang Node.js mao ang "engine" nga nagpa-dagan sa atong backend code. Dili na kailangan ug separate language para sa server.

---

## 4. 🚂 EXPRESS.JS (Web Framework)

### Unsa ang Express.js?
Ang **Express.js** usa ka **web framework** para sa Node.js nga nag-make ug mas sayon ang pag-create ug web servers ug APIs. Kini nag-provide ug:
- Routing (pag-define sa mga endpoints)
- Middleware (functions nga nag-process sa requests)
- Request/Response handling

### Sa atong Project:
- **Main App**: `backend/index.js` - nag-setup sa Express app
- **Routes**: `backend/routes/` folder
  - `auth.js` - login, logout
  - `bookings.js` - booking operations
  - `gallery.js` - gallery management
  - `announcements.js` - announcements
  - etc.

### Example sa Express Routes:
```javascript
// backend/routes/bookings.js
const express = require('express')
const router = express.Router()

// GET /api/bookings - makuha tanan bookings
router.get('/', async (req, res) => {
  const bookings = await Booking.find()
  res.json(bookings)
})

// POST /api/bookings - mag-create ug bag-ong booking
router.post('/', async (req, res) => {
  const booking = new Booking(req.body)
  await booking.save()
  res.json(booking)
})
```

**Sa simple terms**: Ang Express.js mao ang "framework" nga nag-make ug mas sayon ang pag-create ug API endpoints ug pag-handle sa HTTP requests.

---

## 5. 🐘 MONGOOSE (ODM - Object Document Mapper)

### Unsa ang Mongoose?
Ang **Mongoose** usa ka **ODM (Object Document Mapper)** nga nag-serve as bridge taliwala sa Node.js ug MongoDB. Kini nag-provide ug:
- Schema definition (structure sa data)
- Validation (pag-check kung valid ang data)
- Query building (mas sayon ang pag-query sa database)
- Middleware (pre/post save hooks)

### Sa atong Project:
- **Models**: `backend/models/` folder
  - `User.js` - user schema
  - `Booking.js` - booking schema
  - `Admin.js` - admin schema
  - `Gallery.js` - gallery schema
  - etc.

### Example sa Mongoose Schema:
```javascript
// backend/models/Booking.js
const mongoose = require('mongoose')

// Define ang structure sa booking document
const bookingSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  visitDate: { type: Date, required: true },
  numberOfVisitors: { type: Number, min: 1, max: 50 },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true }) // Auto-add createdAt ug updatedAt

// Create model
const Booking = mongoose.model('Booking', bookingSchema)
```

### Example sa Mongoose Operations:
```javascript
// Create (Save)
const booking = new Booking({
  fullName: "Juan Dela Cruz",
  email: "juan@example.com",
  visitDate: new Date("2024-12-25")
})
await booking.save()

// Read (Find)
const bookings = await Booking.find({ status: 'confirmed' })

// Update
await Booking.findByIdAndUpdate(id, { status: 'confirmed' })

// Delete
await Booking.findByIdAndDelete(id)
```

**Sa simple terms**: Ang Mongoose mao ang "translator" nga nag-convert sa JavaScript objects ngadto sa MongoDB documents ug vice versa.

---

## 6. ⚛️ REACT (Frontend Framework)

### Unsa ang React?
Ang **React** usa ka **JavaScript library** para sa pag-create ug user interfaces. Kini nag-allow sa pag-create ug reusable components ug efficient rendering.

### Sa atong Project:
- **Location**: `frontend/` folder
- **Main File**: `frontend/src/App.jsx`
- **Components**: `frontend/src/components/`
  - `AdminPage/` - admin dashboard components
  - `GuestPage/` - guest-facing pages
  - `SuperPage/` - super admin pages

### Example sa React Component:
```javascript
// frontend/src/components/Login.jsx
import React, { useState } from 'react'

function Login() {
  const [email, setEmail] = useState('')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Call backend API
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  )
}
```

**Sa simple terms**: Ang React mao ang "frontend" nga nag-display sa UI ug nag-interact sa users. Kini nag-call sa backend API para sa data.

---

## 7. 🔄 How They Work Together

### Complete Flow Example: Creating a Booking

```
1. USER (Frontend - React)
   ↓
   User fills booking form sa React component
   ↓
   
2. FRONTEND (React)
   ↓
   Sends POST request to backend:
   fetch('http://localhost:5000/api/bookings', {
     method: 'POST',
     body: JSON.stringify(bookingData)
   })
   ↓
   
3. BACKEND (Node.js + Express)
   ↓
   Express route receives request:
   router.post('/bookings', async (req, res) => {
     // Process the request
   })
   ↓
   
4. MONGOOSE (ODM)
   ↓
   Creates Booking model instance:
   const booking = new Booking(req.body)
   ↓
   
5. MONGODB (Database)
   ↓
   Saves document to database:
   await booking.save()
   ↓
   
6. RESPONSE
   ↓
   Backend sends response to frontend:
   res.json({ success: true, booking })
   ↓
   
7. FRONTEND (React)
   ↓
   Updates UI to show success message
```

---

## 8. 📦 Other Important Terms sa atong Project

### JWT (JSON Web Token)
- **Purpose**: Authentication - nag-identify kung kinsa ang user
- **Location**: `backend/utils/jwt.js`
- **Usage**: After login, backend nag-generate ug token nga gigamit sa frontend para sa authenticated requests

### Middleware
- **Purpose**: Functions nga nag-run before ang main route handler
- **Examples**:
  - `auth.js` - nag-check kung authenticated ang user
  - `validation.js` - nag-validate sa input data
  - `logging.js` - nag-log sa mga requests

### API Endpoints
- **Purpose**: Mga pultahan para sa frontend makakonek sa backend
- **Format**: `http://localhost:5000/api/[route]`
- **Examples**:
  - `GET /api/bookings` - makuha tanan bookings
  - `POST /api/bookings` - mag-create ug booking
  - `PUT /api/bookings/:id` - mag-update ug booking
  - `DELETE /api/bookings/:id` - mag-delete ug booking

### Environment Variables (.env)
- **Purpose**: Nag-store sa sensitive data (passwords, API keys)
- **Location**: `.env` file (dili na-commit sa git)
- **Examples**:
  - `MONGO_URI_ADMIN` - MongoDB connection string
  - `JWT_SECRET` - Secret key para sa JWT
  - `SESSION_SECRET` - Secret key para sa sessions

---

## 9. 🏗️ Project Structure Summary

```
Museum/
├── backend/              # Backend (Node.js + Express)
│   ├── index.js         # Main server file
│   ├── db.js            # MongoDB connections
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, validation, logging
│   └── utils/           # Helper functions
│
├── frontend/            # Frontend (React)
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── components/  # React components
│   │   └── styles/      # CSS files
│   └── package.json     # Frontend dependencies
│
└── package.json         # Root package.json
```

---

## 10. 🔑 Key Takeaways

1. **Backend** = Server-side code nga nag-handle sa logic ug database
2. **MongoDB** = NoSQL database nga nag-store sa data sa JSON format
3. **Node.js** = JavaScript runtime para sa server
4. **Express.js** = Web framework para sa Node.js
5. **Mongoose** = ODM nga nag-connect sa Node.js ug MongoDB
6. **React** = Frontend library para sa UI
7. **NoSQL** = Flexible database nga walay fixed tables

### Simple Analogy:
- **Frontend (React)** = Ang "storefront" nga makita sa customers
- **Backend (Node.js + Express)** = Ang "warehouse" nga nag-process sa orders
- **MongoDB** = Ang "storage room" nga nag-keep sa inventory
- **Mongoose** = Ang "manager" nga nag-organize sa storage

---

## 📝 Summary sa atong Tech Stack

| Technology | Purpose | Location |
|------------|---------|----------|
| **Node.js** | JavaScript runtime sa server | `backend/` |
| **Express.js** | Web framework | `backend/index.js` |
| **MongoDB** | Database | `backend/db.js` |
| **Mongoose** | Database ORM | `backend/models/` |
| **React** | Frontend UI | `frontend/src/` |
| **JWT** | Authentication | `backend/utils/jwt.js` |

---

**Note**: Kini nga explanation nag-focus sa practical application sa atong project. Para sa mas detailed technical documentation, check ang official documentation sa each technology.

