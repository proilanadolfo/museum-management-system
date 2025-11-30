# 🚀 Unsaon Pag-Run sa System nga Mo-Gana ang TBCC

## ✅ Good News: TBCC Na-Integrate Na!

Ang TBCC na-integrate na sa inyong system. Automatic na siya mo-work kung mo-start ninyo ang backend server.

---

## 📋 Step-by-Step Guide

### Step 1: I-Ensure nga Na-Setup na ang .env File

I-check nga naa na ang `.env` file sa `backend/` folder:

```bash
cd backend
# I-check kung naa ang .env file
dir .env    # Windows
ls .env     # Mac/Linux
```

Kung wala pa, i-create ug `.env` file (tan-awa ang `SETUP_GUIDE.md`).

---

### Step 2: Start ang Backend Server

**Option A: Gamit ang Terminal**

```bash
cd backend
npm start
```

**Option B: Gamit ang start-dev.bat (Windows)**

```bash
# Sa root folder
start-dev.bat
```

**Option C: Gamit ang npm script**

```bash
# Sa root folder
npm run start
```

**Expected Output:**
```
MongoDB connected: museum_admin, museum_superadmin & museum_bookings
API running on http://localhost:5000
```

---

### Step 3: I-Verify nga Na-Run na ang TBCC

Ang TBCC automatic na mo-start kung mo-start ang server. I-check ang console - wala kay special message, pero ang TBCC routes naa na.

**I-Test ang TBCC:**

```bash
# Sa laing terminal o browser
curl http://localhost:5000/api/tbcc/stats
```

O i-open sa browser:
```
http://localhost:5000/api/tbcc/stats
```

**Note:** Kailangan ninyo mag-login as admin para ma-access ang TBCC stats.

---

## 🧪 Testing TBCC

### Test 1: I-Run ang Test Script

```bash
cd backend
node test-tbcc.js
```

**Expected Output:**
```
🧪 Testing TBCC Implementation

Test 1: Start Transaction
✅ Transaction started: TXN-1234567890-abc123
   Timestamp: 1234567890123456

Test 2: Validate Write (new item)
✅ Write allowed: true

Test 3: Commit Transaction
✅ Commit success: true
   Operations: 1
   Duration: 5ms

...
✅ All tests completed!
```

---

### Test 2: Gamit ang API Endpoints

**1. Get TBCC Statistics:**

```bash
# Gamit ang curl
curl -X GET http://localhost:5000/api/tbcc/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# O sa browser (after login)
http://localhost:5000/api/tbcc/stats
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "activeTransactions": 0,
    "committedTransactions": 0,
    "abortedTransactions": 0,
    "totalDataItems": 0,
    "totalLogs": 0
  },
  "recentLogs": []
}
```

---

## 🔧 Integration sa Existing Routes (Optional)

Kung gusto ninyo i-activate ang TBCC sa inyong existing routes, i-follow ang mosunod:

### Example: I-Add TBCC sa Booking Routes

**1. I-Open ang `backend/routes/bookings.js`**

**2. I-Add ang TBCC middleware:**

```javascript
// Sa top sa file, i-add:
const { withTBCCRead, withTBCCWrite } = require('../middleware/tbcc')

// Example: I-protect ang GET booking
router.get('/bookings/:id', 
  withTBCCRead(
    async (req, res) => {
      const booking = await Booking.findById(req.params.id)
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Not found' })
      }
      return booking
    },
    {
      operation: 'READ_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => req.params.id
    }
  )
)

// Example: I-protect ang POST booking
router.post('/bookings',
  withTBCCWrite(
    async (req, res) => {
      const booking = new Booking(req.body)
      const saved = await booking.save()
      return saved
    },
    {
      operation: 'CREATE_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => req.body._id || 'new'
    }
  )
)
```

**3. I-Save ug i-restart ang server**

---

## 📊 Monitoring TBCC

### 1. View Statistics

**Endpoint:** `GET /api/tbcc/stats`

**Response:**
```json
{
  "success": true,
  "statistics": {
    "activeTransactions": 5,
    "committedTransactions": 150,
    "abortedTransactions": 3,
    "totalDataItems": 1200,
    "totalLogs": 500
  },
  "recentLogs": [
    {
      "transactionId": "TXN-...",
      "action": "COMMIT",
      "timestamp": "2024-12-27T10:30:00.000Z",
      "data": { ... }
    }
  ]
}
```

### 2. View Transaction Status

**Endpoint:** `GET /api/tbcc/transaction/:transactionId`

**Example:**
```bash
GET /api/tbcc/transaction/TXN-1234567890-abc123
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "transactionId": "TXN-1234567890-abc123",
    "timestamp": 1234567890123456,
    "status": "committed",
    "operation": "CREATE_BOOKING",
    "userId": "admin123",
    "operations": 1,
    "duration": 100
  }
}
```

---

## 🎯 Quick Start Checklist

- [ ] ✅ Backend server naka-start na
- [ ] ✅ MongoDB connected
- [ ] ✅ TBCC routes accessible (`/api/tbcc/stats`)
- [ ] ✅ Test script mo-run (`node test-tbcc.js`)
- [ ] ✅ (Optional) Na-integrate na sa routes

---

## 🔍 Troubleshooting

### Issue: "Cannot GET /api/tbcc/stats"

**Solution:**
- I-check kung naka-start na ang backend server
- I-verify nga naa ang TBCC routes sa `backend/index.js` (Line 129-130)
- I-check kung authenticated na (kailangan admin token)

### Issue: "Transaction not found"

**Solution:**
- Normal ra ni kung ang transaction na-commit na o na-abort na
- Ang transactions ma-cleanup after 1 hour
- I-check ang statistics para sa active transactions

### Issue: TBCC Dili Mo-Work

**Solution:**
1. I-check ang console logs - naa bay errors?
2. I-verify nga naa ang TBCC files:
   - `backend/services/tbccManager.js`
   - `backend/middleware/tbcc.js`
   - `backend/routes/tbcc.js`
3. I-restart ang server

---

## 📝 Important Notes

1. **TBCC Automatic na**: Ang TBCC mo-work automatically kung mo-start ninyo ang server. Wala kay kailangan i-configure.

2. **Optional Integration**: Ang TBCC optional sa existing routes. Kung gusto ninyo i-protect ang specific routes, i-add lang ang middleware.

3. **Monitoring**: Gamit ang `/api/tbcc/stats` para ma-monitor ang transactions.

4. **Testing**: Gamit ang `test-tbcc.js` para ma-test ang TBCC functionality.

---

## ✅ Summary

**Para ma-run ang system nga mo-gana ang TBCC:**

1. **Start ang backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **I-verify nga working:**
   ```bash
   node test-tbcc.js
   ```

3. **I-monitor:**
   - `GET /api/tbcc/stats` - View statistics
   - `GET /api/tbcc/transaction/:id` - View transaction

4. **(Optional) I-integrate sa routes:**
   - Tan-awa ang `backend/routes/bookings-tbcc-example.js`
   - I-follow ang pattern

**Ang TBCC automatic na mo-work kung mo-start ninyo ang server!** 🎉

---

## 🆘 Need Help?

1. I-check ang `TBCC_IMPLEMENTATION_GUIDE.md` para sa detailed guide
2. I-check ang `TBCC_SUMMARY.md` para sa quick reference
3. I-run ang `test-tbcc.js` para ma-verify nga working

**Happy Coding! 🚀**

