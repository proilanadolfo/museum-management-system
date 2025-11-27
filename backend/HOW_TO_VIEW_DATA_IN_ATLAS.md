# 📊 Paano Makita ang Data sa MongoDB Atlas

## Method 1: Gamit ang MongoDB Atlas UI (Easiest)

### Step 1: Adto sa MongoDB Atlas Dashboard
1. I-login sa [MongoDB Atlas](https://cloud.mongodb.com)
2. I-click ang imong **Project** (Project 0)
3. I-click ang **"Browse Collections"** button sa Cluster0 card
   - O i-click ang **"DATABASE"** → **"Browse Collections"** sa left sidebar

### Step 2: Pili ang Database
Sa left sidebar, makita nimo ang 3 ka databases:
- **museum_admin** - Para sa admin users
- **museum_superadmin** - Para sa super admin users  
- **museum_bookings** - Para sa bookings data

I-click ang database nga gusto nimo i-view.

### Step 3: Pili ang Collection
Human sa pag-click sa database, makita nimo ang collections:
- **admins** - Admin users
- **superadmins** - Super admin users
- **bookings** - Booking records
- **attendances** - Attendance records
- **announcements** - Announcements
- **galleries** - Gallery items
- **museumsettings** - Museum settings
- **auditlogs** - Audit logs
- **reporttemplates** - Report templates

I-click ang collection nga gusto nimo i-view.

### Step 4: View Documents
Human sa pag-click sa collection, makita nimo ang tanan nga documents sa table format. Pwede nimo:
- I-sort ang columns
- I-filter ang data
- I-edit ang documents (double-click)
- I-delete ang documents
- I-add bag-ong documents

## Method 2: Gamit ang Script (Para sa Quick View)

I-run ang script para makita ang summary sa data:

```bash
cd backend
node view-data.js
```

Kini mag-show sa:
- Number of collections per database
- Number of documents per collection
- Sample data gikan sa each collection

## Method 3: Gamit ang MongoDB Compass (Desktop App)

1. **Download MongoDB Compass**
   - Adto sa [MongoDB Compass Download](https://www.mongodb.com/try/download/compass)
   - I-install ang application

2. **Connect sa MongoDB Atlas**
   - I-open ang MongoDB Compass
   - I-paste ang connection string gikan sa Atlas
   - I-replace ang `<password>` sa actual password
   - I-click **"Connect"**

3. **Browse Collections**
   - Makita nimo ang tanan nga databases ug collections
   - I-click para ma-view ang data

## 📋 Common Collections sa Imong System

### museum_admin Database
- **admins** - Admin user accounts

### museum_superadmin Database  
- **superadmins** - Super admin user accounts

### museum_bookings Database
- **bookings** - Guest booking records
- **attendances** - Visitor attendance records
- **announcements** - Museum announcements
- **galleries** - Gallery/photo items
- **museumsettings** - Museum configuration
- **auditlogs** - System audit logs
- **reporttemplates** - Report templates

## 💡 Tips

1. **Search Function**: Gamit ang search bar sa Atlas UI para ma-filter ang data
2. **Export Data**: Pwede nimo i-export ang data as JSON gikan sa Atlas UI
3. **Real-time Updates**: Ang data sa Atlas UI real-time, so makita nimo dayon ang changes
4. **Indexes**: I-check ang indexes sa collection para ma-optimize ang queries

## 🔍 Sample Queries (Para sa Advanced Users)

Kung gusto nimo mag-query sa data programmatically, pwede nimo gamiton:

```javascript
// View all bookings
const bookings = await Booking.find({})

// View confirmed bookings
const confirmed = await Booking.find({ status: 'confirmed' })

// View bookings for today
const today = new Date()
today.setHours(0, 0, 0, 0)
const todayBookings = await Booking.find({ visitDate: { $gte: today } })
```

## ⚠️ Important Notes

- **Sensitive Data**: Ang passwords naka-hash, so dili nimo makita ang actual passwords
- **Timestamps**: Ang tanan nga documents naa `createdAt` ug `updatedAt` fields
- **Data Size**: Kung daghan kaayo ang data, i-use ang pagination sa Atlas UI

