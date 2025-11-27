# 🔄 Real-Time Database Sync Setup

## Overview

Ang system ninyo karon naa na **real-time synchronization** sa tunga sa MongoDB Atlas (cloud) ug Local MongoDB (local). Kini nag-means nga:

- ✅ Ang tanan nga changes sa Atlas automatic nga ma-sync sa Local DB
- ✅ Real-time sync gamit ang MongoDB Change Streams
- ✅ Automatic initial sync sa existing data
- ✅ Automatic reconnection kung naay connection issues

## How It Works

1. **Primary Database**: MongoDB Atlas (cloud) - mao ni ang main database
2. **Secondary Database**: Local MongoDB (localhost:27017) - backup/sync database
3. **Sync Direction**: Atlas → Local (one-way sync)
4. **Sync Method**: MongoDB Change Streams (real-time)

## Setup Instructions

### Step 1: Ensure Local MongoDB is Running

I-ensure nga naka-install ug naka-run ang MongoDB sa local machine:

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"
```

Kung wala pa naka-install:
- Download gikan sa [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- I-install ug i-start ang MongoDB service

### Step 2: Enable Sync sa .env File

I-add ang mosunod sa `backend/.env` file:

```env
# Real-time Database Sync Configuration
ENABLE_DB_SYNC=true

# Local MongoDB Connection Strings (optional - defaults to localhost:27017)
MONGO_URI_ADMIN_LOCAL=mongodb://127.0.0.1:27017/museum_admin
MONGO_URI_SUPERADMIN_LOCAL=mongodb://127.0.0.1:27017/museum_superadmin
MONGO_URI_BOOKINGS_LOCAL=mongodb://127.0.0.1:27017/museum_bookings
```

**Note**: Kung wala nimo i-set ang `MONGO_URI_*_LOCAL`, automatic nga mag-use sa default localhost connections.

### Step 3: Restart Backend Server

I-restart ang backend server:

```bash
cd backend
npm run start
```

### Step 4: Verify Sync is Working

Dapat makita nimo sa console:

```
✅ Local database connections established
🔄 Starting initial sync from Atlas to Local DB...
✅ Synced X documents: admin.admins
✅ Synced X documents: bookings.bookings
✅ Initial sync completed!
👁️  Watching admin.admins for changes
👁️  Watching bookings.bookings for changes
✅ Real-time sync is now active!
```

## How to Use

### View Synced Data sa Local DB

I-connect sa local MongoDB:

```bash
mongosh
```

O i-use ang MongoDB Compass:
- Connection string: `mongodb://127.0.0.1:27017`
- I-browse ang databases: `museum_admin`, `museum_superadmin`, `museum_bookings`

### Check Sync Status

I-run ang status check:

```bash
node -e "require('dotenv').config(); const sync = require('./services/dbSync'); console.log(sync.getStatus())"
```

## Sync Behavior

### What Gets Synced

- ✅ **All Collections**: Tanan nga collections sa 3 ka databases
- ✅ **All Operations**: INSERT, UPDATE, DELETE, REPLACE
- ✅ **Real-time**: Changes ma-sync sulod sa milliseconds

### Initial Sync

Kung mag-start ang sync:
1. I-copy ang tanan nga existing data gikan sa Atlas to Local
2. I-clear ang existing local data (para sa same collections)
3. I-insert ang tanan nga documents gikan sa Atlas

### Real-time Sync

Human sa initial sync:
- Ang tanan nga changes sa Atlas automatic nga ma-sync sa Local
- Changes ma-sync sulod sa milliseconds
- Automatic reconnection kung naay connection issues

## Configuration Options

### Enable/Disable Sync

Sa `.env` file:
```env
ENABLE_DB_SYNC=true   # Enable sync
ENABLE_DB_SYNC=false  # Disable sync (default)
```

### Custom Local Connection Strings

Kung gusto nimo mag-use ug different local MongoDB:

```env
MONGO_URI_ADMIN_LOCAL=mongodb://localhost:27017/museum_admin
MONGO_URI_SUPERADMIN_LOCAL=mongodb://localhost:27017/museum_superadmin
MONGO_URI_BOOKINGS_LOCAL=mongodb://localhost:27017/museum_bookings
```

## Troubleshooting

### Issue: "Local DB not available"

**Solution**: 
- I-check kung naka-run ang MongoDB sa local
- I-verify ang connection string sa `.env`

### Issue: "Change stream error"

**Solution**:
- Automatic reconnection sulod sa 5 seconds
- I-check ang MongoDB Atlas connection
- I-verify ang network connection

### Issue: Sync not starting

**Solution**:
- I-check kung `ENABLE_DB_SYNC=true` sa `.env`
- I-restart ang backend server
- I-check ang console logs para sa errors

## Benefits

1. **Backup**: Local DB serves as automatic backup
2. **Offline Access**: Pwede ma-access ang data bisan offline
3. **Development**: Pwede mag-test sa local data without affecting Atlas
4. **Performance**: Local queries mas paspas
5. **Data Safety**: Duplicate data sa duha ka locations

## Important Notes

⚠️ **One-way Sync**: Ang sync one-way lang (Atlas → Local). Changes sa Local dili ma-sync balik sa Atlas.

⚠️ **Local DB Overwrites**: Ang initial sync mag-overwrite sa existing local data.

⚠️ **Resource Usage**: Ang sync nag-consume ug resources. I-disable kung dili needed.

## Disable Sync

Kung gusto nimo i-disable ang sync:

1. I-update ang `.env`:
   ```env
   ENABLE_DB_SYNC=false
   ```

2. I-restart ang backend server

Ang sync ma-stop automatically.

