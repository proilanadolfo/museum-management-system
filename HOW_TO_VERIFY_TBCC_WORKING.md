# ✅ Unsaon Pag-Makabalo nga Na-Gana na ang TBCC

## 🎯 Quick Verification Methods

### Method 1: I-Test Gamit ang Test Script (Pinakasayon)

```bash
cd backend
node test-tbcc.js
```

**Expected Output kung working:**
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

Test 4: Write-Read Conflict Detection
✅ Read allowed: false
   Aborted: true
   Reason: Write-Read Conflict: Transaction TS(50) < Item WTS(100)

Test 5: Write-Write Conflict Detection
✅ Write allowed: false
   Aborted: true
   Reason: Write-Write Conflict: Transaction TS(50) < Item RTS(100)

✅ All tests completed!
```

**Kung makita ninyo ang output sa taas, working na ang TBCC!** ✅

---

### Method 2: Gamit ang API Endpoints

#### Step 1: Start ang Backend Server

```bash
cd backend
npm start
```

#### Step 2: I-Test ang TBCC Statistics Endpoint

**Sa browser o Postman:**

```
GET http://localhost:5000/api/tbcc/stats
```

**Kailangan ninyo mag-login as admin first. Gamit ang token:**

```bash
# 1. Login first
POST http://localhost:5000/api/admin/login
Body: { "username": "admin", "password": "admin123" }

# 2. Copy ang token gikan sa response

# 3. Gamit ang token para sa TBCC stats
GET http://localhost:5000/api/tbcc/stats
Headers: { "Authorization": "Bearer YOUR_TOKEN" }
```

**Expected Response kung working:**
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

**Kung makita ninyo ang response sa taas, working na ang TBCC!** ✅

---

### Method 3: I-Test Concurrent Operations (Real Test)

#### Test Scenario: Concurrent Write Operations

**I-create ug test script:**

```javascript
// test-concurrent-tbcc.js
const axios = require('axios')

const BASE_URL = 'http://localhost:5000/api'

async function testConcurrentWrites() {
  console.log('🧪 Testing Concurrent Writes with TBCC\n')

  // Simulate two concurrent write operations sa same booking
  const bookingId = 'YOUR_BOOKING_ID' // I-replace sa actual booking ID
  
  const promise1 = axios.put(
    `${BASE_URL}/bookings/${bookingId}`,
    { status: 'confirmed' },
    { headers: { Authorization: 'Bearer YOUR_TOKEN' } }
  )

  const promise2 = axios.put(
    `${BASE_URL}/bookings/${bookingId}`,
    { status: 'cancelled' },
    { headers: { Authorization: 'Bearer YOUR_TOKEN' } }
  )

  try {
    const [result1, result2] = await Promise.allSettled([promise1, promise2])
    
    console.log('Result 1:', result1.status)
    if (result1.status === 'fulfilled') {
      console.log('✅ Transaction 1 succeeded')
      console.log('   Transaction ID:', result1.value.data.transaction?.transactionId)
    } else {
      console.log('❌ Transaction 1 failed:', result1.reason.response?.data)
    }
    
    console.log('\nResult 2:', result2.status)
    if (result2.status === 'fulfilled') {
      console.log('✅ Transaction 2 succeeded')
      console.log('   Transaction ID:', result2.value.data.transaction?.transactionId)
    } else {
      console.log('❌ Transaction 2 failed:', result2.reason.response?.data)
      if (result2.reason.response?.data?.error === 'Transaction conflict') {
        console.log('   🎯 TBCC WORKING! Conflict detected and handled!')
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testConcurrentWrites()
```

**I-run:**
```bash
cd backend
node test-concurrent-tbcc.js
```

**Expected Output kung working:**
- One transaction mo-succeed
- One transaction mo-fail with "Transaction conflict" error
- Makita ang transaction IDs sa response

---

### Method 4: I-Check ang Server Logs

**Kung naa kay TBCC operations, makita ninyo sa console:**

```
🟢 TBCC: Transaction started { transactionId: 'TXN-...', timestamp: 1234567890, userId: 'admin', operation: 'UPDATE_BOOKING' }
✅ TBCC: Transaction committed { transactionId: 'TXN-...', operations: 1, duration: 100 }
```

**O kung naa conflict:**
```
🔄 TBCC: Retrying transaction (attempt 1/3) { transactionId: 'TXN-...', reason: 'Write-Read Conflict...' }
🔴 TBCC: Transaction aborted { transactionId: 'TXN-...', reason: 'Write-Read Conflict...' }
```

**Kung makita ninyo ang logs sa taas, working na ang TBCC!** ✅

---

### Method 5: I-Check ang Database

**I-check kung naa na ang TBCCDataItem collection:**

```javascript
// Sa MongoDB shell o sa Node.js
const TBCCDataItem = require('./models/TBCCDataItem')

async function checkTBCCData() {
  const items = await TBCCDataItem.find().limit(5)
  console.log('TBCC Data Items:', items)
  
  if (items.length > 0) {
    console.log('✅ TBCC data items found - TBCC is working!')
  } else {
    console.log('⚠️  No TBCC data items yet - TBCC will create them on first use')
  }
}

checkTBCCData()
```

---

## 🔍 Step-by-Step Verification

### Complete Verification Process

#### Step 1: I-Verify nga Na-Start na ang Server

```bash
cd backend
npm start
```

**I-check:**
- ✅ Server mo-start without errors
- ✅ MongoDB connected
- ✅ "API running on http://localhost:5000" naa sa console

#### Step 2: I-Run ang Test Script

```bash
cd backend
node test-tbcc.js
```

**I-check:**
- ✅ All tests mo-pass
- ✅ Wala kay errors
- ✅ Makita ang transaction IDs

#### Step 3: I-Test ang API Endpoint

```bash
# Gamit ang curl o Postman
GET http://localhost:5000/api/tbcc/stats
```

**I-check:**
- ✅ Mo-return ug JSON response
- ✅ Naa ang "statistics" object
- ✅ Wala kay errors

#### Step 4: I-Test Real Operation (kung na-integrate na)

**Kung na-integrate na ninyo ang TBCC sa inyong routes:**

```bash
# Example: Create booking
POST http://localhost:5000/api/bookings
Body: { /* booking data */ }
```

**I-check sa response:**
```json
{
  "success": true,
  "data": { /* booking data */ },
  "transaction": {
    "transactionId": "TXN-...",
    "timestamp": 1234567890123456,
    "operations": 1,
    "duration": 100
  }
}
```

**Kung makita ninyo ang "transaction" object sa response, working na ang TBCC!** ✅

---

## 🎯 Signs nga Working na ang TBCC 

### ✅ Positive Signs:

1. **Test script mo-run successfully**
   - All tests pass
   - Makita ang transaction IDs 
   - Makita ang conflict detection 

2. **API endpoints mo-respond**
   - `/api/tbcc/stats` mo-return ug data
   - `/api/tbcc/transaction/:id` mo-return ug transaction info

3. **Server logs show TBCC activity**
   - Makita ang "TBCC: Transaction started"
   - Makita ang "TBCC: Transaction committed"
   - Makita ang conflict detection messages

4. **Response includes transaction info**
   - Kung na-integrate na, makita ang "transaction" object sa response
   - Na-include ang transactionId ug timestamp

5. **Database has TBCC data**
   - TBCCDataItem collection naa na
   - Na-store ang RTS/WTS values

---

## ❌ Signs nga Dili Working

### ⚠️ Warning Signs:

1. **Test script mo-fail**
   - Errors sa console
   - "Cannot find module" errors

2. **API endpoints mo-return error**
   - 404 Not Found
   - 500 Internal Server Error

3. **Wala kay TBCC logs sa console**
   - Wala kay "TBCC:" messages
   - Wala kay transaction activity

4. **Response wala ang transaction info**
   - Wala ang "transaction" object
   - Normal response lang (wala TBCC)

---

## 🧪 Quick Test Checklist

I-check ang mosunod:

- [ ] Backend server naka-start na
- [ ] `node test-tbcc.js` mo-run successfully
- [ ] `/api/tbcc/stats` mo-return ug response
- [ ] Server logs show TBCC messages
- [ ] (Optional) Response includes transaction info

**Kung tanan check, working na ang TBCC!** ✅

---

## 📊 Monitoring TBCC in Real-Time

### Gamit ang Browser Console

**1. I-open ang browser developer tools (F12)**

**2. I-run ang JavaScript code:**

```javascript
// I-monitor ang TBCC statistics
async function monitorTBCC() {
  const response = await fetch('http://localhost:5000/api/tbcc/stats', {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  })
  const data = await response.json()
  console.log('TBCC Statistics:', data.statistics)
  console.log('Recent Logs:', data.recentLogs)
}

// I-run every 5 seconds
setInterval(monitorTBCC, 5000)
```

**3. I-check ang console - makita ninyo ang real-time statistics**

---

## 🎯 Summary

**Para ma-verify nga working na ang TBCC:**

1. **I-run ang test script:**
   ```bash
   cd backend
   node test-tbcc.js
   ```
   ✅ Kung mo-pass, working na!

2. **I-check ang API:**
   ```
   GET /api/tbcc/stats
   ```
   ✅ Kung mo-return ug data, working na!

3. **I-check ang logs:**
   - I-look for "TBCC:" messages sa console
   ✅ Kung naa, working na!

4. **I-check ang response:**
   - Kung na-integrate na, makita ang "transaction" object
   ✅ Kung naa, working na!

---

## 🆘 Troubleshooting

### Issue: Test script mo-fail

**Solution:**
```bash
# I-check kung naa ang file
ls backend/test-tbcc.js

# I-check kung naa ang dependencies
cd backend
npm install
```

### Issue: API endpoint mo-return 404

**Solution:**
- I-check kung naa ang TBCC routes sa `backend/index.js` (Line 129-130)
- I-restart ang server

### Issue: Wala kay TBCC logs

**Solution:**
- I-check kung na-integrate na ang TBCC sa inyong routes
- TBCC mo-log lang kung naa kay operations nga naggamit sa TBCC

---

**Basaha ang `HOW_TO_RUN_TBCC.md` para sa detailed instructions!**

**Happy Testing! 🚀**

