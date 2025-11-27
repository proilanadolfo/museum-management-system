# 📱 Google Calendar Notifications - How It Works

## ⚠️ Important: Google Calendar Sync Rules

### Dili Mo-Sync ang Pending Bookings

Ang Google Calendar **DILI** mo-sync sa:
- ❌ **New bookings** (status: pending)
- ❌ **Pending bookings** (wala pa na-confirm)

Ang Google Calendar **MO-SYNC LANG** sa:
- ✅ **Confirmed bookings** (na-confirm na sa admin)
- ✅ **Cancelled bookings** (mo-delete ang event)

---

## 🔄 How It Works:

### Step 1: Guest Creates Booking
```
Guest creates booking
  ↓
Status: "pending"
  ↓
❌ WALA mo-sync sa Google Calendar
```

### Step 2: Admin Confirms Booking
```
Admin confirms booking
  ↓
Status: "confirmed"
  ↓
✅ MO-SYNC sa Google Calendar
  ↓
Event created sa Google Calendar
```

### Step 3: Notifications
```
Event created sa Google Calendar
  ↓
Reminders set:
  - 24 hours before visit date
  - 1 hour before visit date
  ↓
✅ Mo-receive ka og notification sa phone
```

---

## 📱 When Mo-Receive ka og Notification?

### Dili Mo-Notify Karon:
- ❌ When guest creates booking (pending pa)
- ❌ When booking is created

### Mo-Notify Karon:
- ✅ **24 hours before** sa visit date
- ✅ **1 hour before** sa visit date

### Example:
```
Today: January 1
Booking created: January 1 (pending)
Admin confirms: January 1
Visit date: January 5

Notifications:
- January 4 (24 hours before) ✅
- January 5, 1 hour before visit time ✅
```

---

## 🔧 How to Test:

### Step 1: Create Booking
1. I-create ang booking as guest
2. Status: "pending"
3. ❌ Wala pa sa Google Calendar

### Step 2: Confirm Booking (as Admin)
1. I-login sa Admin Dashboard
2. I-go sa "Bookings" tab
3. I-find ang pending booking
4. I-click "Confirm" o change status to "confirmed"
5. ✅ Mo-sync na sa Google Calendar

### Step 3: Check Google Calendar
1. I-open ang Google Calendar app sa phone
2. I-check kung naa na ang event
3. I-check ang date - dapat naa sa visit date

### Step 4: Wait for Notification
- Mo-receive ka og notification **24 hours before** sa visit date
- Mo-receive ka og notification **1 hour before** sa visit date

---

## ⚠️ Common Misunderstandings:

### ❌ "Mo-notify karon when booking is created"
- **Dili** - mo-notify lang **before** sa visit date

### ❌ "Mo-sync ang pending bookings"
- **Dili** - mo-sync lang ang **confirmed** bookings

### ❌ "Mo-notify immediately"
- **Dili** - mo-notify lang **24 hours before** ug **1 hour before**

---

## ✅ Summary:

**Para Makita ang Booking sa Google Calendar:**
1. ✅ Guest creates booking (pending)
2. ✅ Admin confirms booking (confirmed)
3. ✅ Event syncs to Google Calendar
4. ✅ Mo-receive ka og notification 24 hours before visit date

**Para Ma-Test:**
1. I-create ang booking
2. I-confirm ang booking as admin
3. I-check ang Google Calendar app
4. I-wait sa notification (24 hours before visit date)

---

## 🔍 Troubleshooting:

### Wala Makita sa Google Calendar?
1. ✅ I-check kung na-confirm na ang booking
2. ✅ I-check kung connected ang Google Calendar (Settings)
3. ✅ I-check ang backend console for errors
4. ✅ I-try ang "Test Connection" button

### Wala Mo-Notify?
1. ✅ I-check kung naa na ang event sa Google Calendar
2. ✅ I-check ang notification settings sa Google Calendar app
3. ✅ I-check kung 24 hours before na sa visit date
4. ✅ I-check ang timezone settings

