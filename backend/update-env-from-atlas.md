# 🔧 How to Update .env with Correct MongoDB Atlas Connection String

## Current Status
✅ Ang `.env` file format tama na
✅ Password na-encode na (`%21` para sa `!`)
✅ Database names tama na

## Issue
Ang hostname `cluster0.wactdc.mongodb.net` wala makuha sa DNS. Posible nga:
- Sayop ang hostname gikan sa Atlas
- Wala pa fully provisioned ang cluster
- Naay typo sa hostname

## Solution: Get Exact Connection String from MongoDB Atlas

### Step 1: Get Connection String from Atlas

1. **Adto sa MongoDB Atlas Dashboard**
   - I-login sa imong account
   - I-click ang **"Connect"** button sa Cluster0

2. **Pili ang "Connect your application"**
   - I-click ang **"Connect your application"**
   - Pili ang **"Node.js"** driver
   - Pili ang version **4.1 or later**

3. **Kopyaha ang Connection String**
   - Dapat makita nimo:
     ```
     mongodb+srv://attendance_admin:<password>@cluster0.XXXXX.mongodb.net/?retryWrites=true&w=majority
     ```
   - **IMPORTANTE**: I-verify ang exact hostname (`cluster0.XXXXX.mongodb.net`)
   - Ang `XXXXX` dapat unique identifier

### Step 2: Update .env File

I-replace ang hostname sa tanan nga 3 ka connection strings:

**Current (sayop):**
```
cluster0.wactdc.mongodb.net
```

**I-replace sa correct hostname gikan sa Atlas:**
```
cluster0.XXXXX.mongodb.net  (where XXXXX is from Atlas)
```

### Step 3: Format sa .env File

I-ensure nga ang format mao ni:

```env
MONGO_URI_ADMIN=mongodb+srv://attendance_admin:PardyAttend123%21@CORRECT_HOSTNAME_HERE/museum_admin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_SUPERADMIN=mongodb+srv://attendance_admin:PardyAttend123%21@CORRECT_HOSTNAME_HERE/museum_superadmin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_BOOKINGS=mongodb+srv://attendance_admin:PardyAttend123%21@CORRECT_HOSTNAME_HERE/museum_bookings?retryWrites=true&w=majority&appName=Cluster0
```

**Important Notes:**
- `PardyAttend123%21` - ang `%21` mao ang encoded `!`
- `CORRECT_HOSTNAME_HERE` - i-replace sa exact hostname gikan sa Atlas
- Walay trailing spaces sa end sa line

### Step 4: Test Connection

Pagkahuman sa pag-update, i-test:

```bash
node test-connection.js
```

O i-start ang server:

```bash
npm run start
```

## Quick Verification

I-run ni para ma-check ang format:
```bash
node check-env-format.js
```

I-run ni para ma-verify ang connection strings:
```bash
node verify-connection-string.js
```

## Common Hostname Formats

Ang hostname gikan sa Atlas dapat murag:
- `cluster0.abc123.mongodb.net`
- `cluster0.xyz789.mongodb.net`
- `cluster0.wactdc.mongodb.net` (kini ang current, pero wala makuha sa DNS)

Kung ang hostname gikan sa Atlas lahi sa `cluster0.wactdc.mongodb.net`, i-update nimo ang tanan nga 3 ka connection strings.

