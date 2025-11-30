# 🚨 Quick Recovery Guide - Kung Ma-Delete ang Data

**Para sa emergency recovery kung na-delete ang data sa database.**

---

## ⚡ Quick Steps (5 minutes)

### Step 1: Stop ang Application
```bash
# Press Ctrl+C sa terminal kung nag-run ang server
# O i-stop ang process
```

### Step 2: List Available Backups
```bash
cd backend
node scripts/restore.js list
```

**Makita nimo:**
```
📦 Available Backups:
📅 2024-12-20_02-00-00  (Before deletion)
📅 2024-12-19_02-00-00  (Older backup)
```

### Step 3: Restore from Backup
```bash
# I-restore gikan sa backup BEFORE ang deletion
node scripts/restore.js 2024-12-20_02-00-00
```

**⚠️ WARNING:** Ma-overwrite ang existing data!

### Step 4: Verify
```bash
# Start ang server
npm start

# Test login
# Check if data na-restore na
```

---

## 📋 Detailed Recovery Process

### Scenario: Na-Delete ang Data

**Example:** Na-delete ang tanan bookings o admin accounts.

### 1. Identify When Data Was Deleted

**Option A: Check Audit Logs**
- Login as superadmin
- Go to Audit Logs
- Filter by action: DELETE
- Check timestamp

**Option B: Check Last Backup**
- Check `backend/backups/` folder
- See latest backup timestamp

### 2. Find Backup Before Deletion

```bash
cd backend
node scripts/restore.js list
```

**Example:**
- Deletion happened: Dec 20, 3:00 PM
- Last backup: Dec 20, 2:00 AM ✅ (Before deletion)
- Use: `2024-12-20_02-00-00`

### 3. Create Safety Backup (Optional but Recommended)

```bash
# Backup current state first (just in case)
npm run backup
```

### 4. Restore from Backup

```bash
# Restore from backup BEFORE deletion
node scripts/restore.js 2024-12-20_02-00-00
```

**What Happens:**
- All 3 databases restored
- Uploads directory restored
- Existing data OVERWRITTEN

### 5. Verify Restore

**Check Database:**
- [ ] Admin accounts exist
- [ ] Super admin accounts exist
- [ ] Bookings exist
- [ ] Gallery items exist
- [ ] Announcements exist

**Test Application:**
- [ ] Can login as superadmin
- [ ] Can login as admin
- [ ] Can view bookings
- [ ] Can view gallery
- [ ] All features working

### 6. Re-apply Legitimate Changes (If Any)

Kung naa legitimate changes after sa backup:
- Check audit logs
- Manually re-enter important data
- Verify everything is correct

---

## 🔄 Automatic Backup Setup

Para ma-automate ang backup (daily automatic):

### Windows: Task Scheduler

1. **Create Batch File:**
   - File: `backend/scripts/auto-backup.bat` (already created)
   - Contains: `npm run backup`

2. **Setup Task:**
   - Open Task Scheduler (`Win + R` → `taskschd.msc`)
   - Create Basic Task
   - Name: "Museum Daily Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start program
   - Program: `C:\Users\adolf\Documents\Museum\backend\scripts\auto-backup.bat`
   - Start in: `C:\Users\adolf\Documents\Museum\backend`

3. **Test:**
   - Right-click task → Run
   - Check `backend/backups/` folder

### Node.js Cron (Alternative)

I-install:
```bash
cd backend
npm install node-cron
```

I-enable sa `backend/index.js` (see `BACKUP_AUTOMATION_GUIDE.md`)

---

## 📅 Backup Schedule

### Recommended:
- **Daily:** 2:00 AM (automatic)
- **Before Major Changes:** Manual backup
- **Before Deployments:** Manual backup

### Retention:
- **Last 7 days:** Automatic (auto-cleanup)
- **Weekly:** Keep for 30 days (manual)
- **Monthly:** Keep for 1 year (manual)

---

## 🛡️ Prevention Tips

### Before Making Changes:
1. ✅ Create manual backup
2. ✅ Test changes in development
3. ✅ Check what will be affected

### Regular Maintenance:
1. ✅ Verify backups are running
2. ✅ Test restore in test environment
3. ✅ Check backup logs
4. ✅ Monitor disk space

---

## 📊 Backup Verification

### Check if Backup is Working:

```bash
# 1. Run backup manually
cd backend
npm run backup

# 2. Check backup directory
dir backend\backups

# 3. Verify backup contents
# Check if JSON files exist
```

### Check Backup Logs:

```bash
# Check backup log file
type backend\backups\backup-log.txt
```

---

## 🚨 Emergency Contacts

**If backup fails or restore doesn't work:**
1. Check `backend/logs/` for error logs
2. Verify MongoDB connection strings in `.env`
3. Check disk space
4. Verify backup files exist

---

## 💡 Quick Commands Reference

### Manual Backup:
```bash
cd backend
npm run backup
```

### List Backups:
```bash
cd backend
node scripts/restore.js list
```

### Restore:
```bash
cd backend
node scripts/restore.js 2024-12-20_02-00-00
```

### Check Backup Logs:
```bash
type backend\backups\backup-log.txt
```

---

## ✅ Recovery Checklist

If data is deleted:

- [ ] Stop application
- [ ] Check audit logs (find deletion time)
- [ ] List available backups
- [ ] Find backup from BEFORE deletion
- [ ] Create safety backup (optional)
- [ ] Restore from backup
- [ ] Verify data is restored
- [ ] Test application
- [ ] Re-apply legitimate changes (if any)
- [ ] Document the incident

---

**Last Updated:** December 2024

