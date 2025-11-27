# 🔧 Fix MongoDB Atlas Connection String

## Problem
Ang error `querySrv ENOTFOUND _mongodb._tcp.cluster0.wactdc.mongodb.net` nagpasabot nga ang cluster hostname dili makuha sa DNS.

## Solution

### Step 1: Get the Correct Connection String from MongoDB Atlas

1. **Adto sa MongoDB Atlas Dashboard**
   - I-login sa imong account
   - I-click ang **"Connect"** button sa Cluster0 card

2. **Pili ang "Connect your application"**
   - I-click ang **"Connect your application"** option
   - Pili ang **"Node.js"** driver
   - Pili ang version **4.1 or later**

3. **Kopyaha ang Connection String**
   - Dapat makita nimo ang connection string nga murag:
     ```
     mongodb+srv://<username>:<password>@cluster0.XXXXX.mongodb.net/?retryWrites=true&w=majority
     ```
   - **IMPORTANTE**: I-verify ang exact hostname (`cluster0.XXXXX.mongodb.net`)
   - Ang `XXXXX` dapat unique identifier para sa imong cluster

### Step 2: Update the .env File

I-replace ang connection strings sa `backend/.env` file:

```env
# MongoDB Atlas Connection Strings
# I-replace ang cluster0.wactdc.mongodb.net sa correct hostname gikan sa Atlas
MONGO_URI_ADMIN=mongodb+srv://attendance_admin:PardyAttend123%21@CLUSTER_HOSTNAME_HERE/museum_admin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_SUPERADMIN=mongodb+srv://attendance_admin:PardyAttend123%21@CLUSTER_HOSTNAME_HERE/museum_superadmin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_BOOKINGS=mongodb+srv://attendance_admin:PardyAttend123%21@CLUSTER_HOSTNAME_HERE/museum_bookings?retryWrites=true&w=majority&appName=Cluster0
```

**Where to find CLUSTER_HOSTNAME_HERE:**
- Sa connection string gikan sa Atlas, ang hostname mao ang part human sa `@` ug before sa `/`
- Example: Kung ang connection string nimo `mongodb+srv://user:pass@cluster0.abc123.mongodb.net/...`
- Ang hostname mao ang `cluster0.abc123.mongodb.net`

### Step 3: Verify the Connection String Format

I-run ang verification script:
```bash
cd backend
node verify-connection-string.js
```

### Step 4: Test the Connection

I-run ang test script:
```bash
node test-connection.js
```

O i-start ang backend server:
```bash
npm run start
```

## Common Issues

### Issue 1: Cluster Not Fully Provisioned
- Kung bag-o lang na-create ang cluster, hulat sulod sa 3-5 minutes
- I-check ang cluster status sa Atlas dashboard

### Issue 2: Wrong Hostname
- I-verify ang exact hostname gikan sa Atlas Connect button
- Dili i-guess ang hostname - kopyaha lang gikan sa Atlas

### Issue 3: DNS Resolution
- I-check kung naa internet connection
- I-try ang different DNS server (8.8.8.8 o 1.1.1.1)

## Quick Check

I-run ni para ma-check ang DNS:
```bash
nslookup cluster0.wactdc.mongodb.net
```

Kung "Non-existent domain" ang result, ang hostname sayop. I-get ang correct hostname gikan sa MongoDB Atlas.

