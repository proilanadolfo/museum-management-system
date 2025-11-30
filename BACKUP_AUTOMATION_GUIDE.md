# 🔄 Automatic Backup Setup Guide

**Purpose:** Para ma-automate ang backup para naa dayon backup kung ma-delete ang data sa database.

---

## 🎯 Overview

Kung ma-delete ang data sa database, pwede nimo i-restore gikan sa backup. Para ma-automate, i-setup nato ang automatic daily backups.

---

## 📋 Option 1: Windows Task Scheduler (Recommended for Windows)

### Step 1: Create Backup Script

I-create ang `backend/scripts/auto-backup.bat`:

```batch
@echo off
cd /d "C:\Users\adolf\Documents\Museum\backend"
call npm run backup
```

**Note:** I-replace ang path sa imong actual path.

### Step 2: Setup Task Scheduler

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type: `taskschd.msc`
   - Press Enter

2. **Create Basic Task:**
   - Click "Create Basic Task" sa right panel
   - Name: `Museum System Daily Backup`
   - Description: `Automatic daily backup for Museum Management System`

3. **Set Trigger:**
   - Trigger: Daily
   - Start: 2:00 AM (or any time you prefer)
   - Recur every: 1 days

4. **Set Action:**
   - Action: Start a program
   - Program/script: `C:\Users\adolf\Documents\Museum\backend\scripts\auto-backup.bat`
   - Start in: `C:\Users\adolf\Documents\Museum\backend`

5. **Finish:**
   - Check "Open the Properties dialog"
   - Click Finish

6. **Configure Properties:**
   - General tab: Check "Run whether user is logged on or not"
   - Conditions tab: Uncheck "Start the task only if the computer is on AC power"
   - Settings tab: 
     - Check "Allow task to be run on demand"
     - Check "Run task as soon as possible after a scheduled start is missed"
   - Click OK

### Step 3: Test the Task

1. Right-click sa task
2. Click "Run"
3. Check if backup nag-run successfully
4. Check `backend/backups/` folder if naa bag-ong backup

---

## 📋 Option 2: PowerShell Scheduled Task (Alternative for Windows)

### Create PowerShell Script

I-create ang `backend/scripts/auto-backup.ps1`:

```powershell
# Change to backend directory
Set-Location "C:\Users\adolf\Documents\Museum\backend"

# Run backup
npm run backup

# Log result
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "backups\backup-log.txt" -Value "$timestamp - Backup completed"
```

### Setup Scheduled Task via PowerShell

I-run sa PowerShell as Administrator:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Users\adolf\Documents\Museum\backend\scripts\auto-backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType S4U -RunLevel Highest
Register-ScheduledTask -TaskName "Museum Daily Backup" -Action $action -Trigger $trigger -Principal $principal -Description "Automatic daily backup for Museum System"
```

---

## 📋 Option 3: Node.js Cron Package (Cross-platform)

### Step 1: Install node-cron

```bash
cd backend
npm install node-cron
```

### Step 2: Create Auto-Backup Service

I-create ang `backend/services/autoBackup.js`:

```javascript
const cron = require('node-cron')
const { performBackup } = require('../scripts/backup')
const logger = require('../utils/logger')

// Run backup daily at 2:00 AM
const scheduleBackup = () => {
  // Cron format: minute hour day month day-of-week
  // '0 2 * * *' = Every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled backup...')
    try {
      await performBackup()
      logger.info('Scheduled backup completed successfully')
    } catch (error) {
      logger.error('Scheduled backup failed', { error: error.message })
    }
  })
  
  logger.info('Automatic backup scheduled: Daily at 2:00 AM')
}

module.exports = { scheduleBackup }
```

### Step 3: Enable in index.js

I-add sa `backend/index.js`:

```javascript
// At the top with other requires
const { scheduleBackup } = require('./services/autoBackup')

// After database connections are established
Promise.all([whenOpen(adminConnection), whenOpen(superAdminConnection), whenOpen(bookingsConnection)])
  .then(async () => {
    console.log('MongoDB connected: museum_admin, museum_superadmin & museum_bookings')
    await ensureDefaultAccounts()
    
    // Enable automatic backups (if enabled in .env)
    if (process.env.ENABLE_AUTO_BACKUP === 'true') {
      scheduleBackup()
      console.log('✅ Automatic backups enabled (Daily at 2:00 AM)')
    }
    
    // ... rest of your code
  })
```

### Step 4: Enable in .env

I-add sa `backend/.env`:

```env
ENABLE_AUTO_BACKUP=true
```

---

## 🔄 How Recovery Works if Data is Deleted

### Scenario: Data Deleted from Database

**Example:** Na-delete ang tanan bookings o admin accounts.

### Recovery Steps:

#### Step 1: Stop the Application
```bash
# Stop the backend server
# Press Ctrl+C if running in terminal
```

#### Step 2: Identify When Data Was Deleted

- Check audit logs: `GET /api/audit-logs?action=DELETE`
- Check when last backup was created
- Find backup from BEFORE the deletion

#### Step 3: List Available Backups

```bash
cd backend
node scripts/restore.js list
```

**Output:**
```
📦 Available Backups:
==================================================

📅 2024-12-20_14-30-00
   Databases: museum_admin, museum_superadmin, museum_bookings

📅 2024-12-19_14-30-00
   Databases: museum_admin, museum_superadmin, museum_bookings
```

#### Step 4: Restore from Backup

```bash
# Restore from backup BEFORE deletion
node scripts/restore.js 2024-12-19_14-30-00
```

**⚠️ WARNING:** This will OVERWRITE existing data!

#### Step 5: Verify Restore

1. Check if data is restored:
   ```bash
   # Test login
   # Check if bookings exist
   # Check if admin accounts exist
   ```

2. Check application:
   - Start backend server
   - Test login
   - Verify data in frontend

#### Step 6: Re-apply Legitimate Changes

Kung naa legitimate changes after sa backup:
- Manually re-enter important data
- Check audit logs para sa changes after backup

---

## 📅 Recommended Backup Schedule

### For Production:

- **Daily Backups:** Every day at 2:00 AM
- **Retention:** Keep last 7 days (automatic cleanup)
- **Weekly Backups:** Every Sunday (keep for 30 days) - manual
- **Monthly Backups:** First day of month (keep for 1 year) - manual

### For Development:

- **Before Major Changes:** Manual backup
- **Before Deployments:** Manual backup
- **Daily:** Optional (if working actively)

---

## 🛡️ Best Practices

### 1. Test Backups Regularly

```bash
# Test restore in test environment
# Verify backup integrity
# Check if all collections are backed up
```

### 2. Monitor Backup Success

- Check `backend/logs/` for backup logs
- Verify `backend/backups/` folder has recent backups
- Set up alerts if backup fails (optional)

### 3. Before Restore:

- ✅ **Always create a backup** before restoring
- ✅ **Stop the application** before restore
- ✅ **Verify backup date** is correct
- ✅ **Notify team** if in production

### 4. After Restore:

- ✅ **Complete verification checklist**
- ✅ **Test all critical features**
- ✅ **Monitor logs** for errors
- ✅ **Document restore** in audit logs

---

## 🔍 Quick Recovery Checklist

If data is deleted:

- [ ] Stop application
- [ ] Check audit logs to find deletion time
- [ ] List available backups
- [ ] Find backup from BEFORE deletion
- [ ] Create backup of current state (just in case)
- [ ] Restore from backup
- [ ] Verify data is restored
- [ ] Test application
- [ ] Re-apply legitimate changes (if any)

---

## 📝 Example: Recovering Deleted Bookings

### Situation:
- All bookings deleted at 3:00 PM on Dec 20
- Last backup: Dec 20 at 2:00 AM (before deletion)

### Recovery:

```bash
# 1. Stop server
# Press Ctrl+C

# 2. List backups
cd backend
node scripts/restore.js list

# 3. Restore from backup before deletion
node scripts/restore.js 2024-12-20_02-00-00

# 4. Verify
# Check if bookings are restored

# 5. Start server
npm start
```

---

## 🚨 Emergency Recovery

### If Backup is Old:

1. **Check backup age:**
   - If backup is > 24 hours old, you'll lose recent data
   - Check RPO (Recovery Point Objective): 24 hours

2. **Partial Recovery:**
   - Restore only affected database/collection
   - Don't restore everything if only one thing was deleted

3. **Data Reconstruction:**
   - Check audit logs for what was deleted
   - Manually re-enter if possible
   - Use audit logs to reconstruct data

---

## 📊 Backup Verification

### Check if Backup is Working:

```bash
# 1. Run backup manually
cd backend
npm run backup

# 2. Check backup directory
ls backend/backups/

# 3. Verify backup contents
# Check if JSON files exist
# Check metadata.json
```

### Verify Backup Integrity:

```bash
# List backups with details
node scripts/restore.js list

# Check metadata
cat backend/backups/museum_bookings-2024-12-20_02-00-00/_metadata.json
```

---

## 💡 Tips

1. **Multiple Backups:** Keep backups in different locations (local + cloud)
2. **Test Restores:** Regularly test restore in test environment
3. **Monitor:** Check backup logs regularly
4. **Document:** Keep track of when backups run
5. **Alert:** Set up notifications if backup fails (optional)

---

## 📞 Quick Commands

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

---

**Last Updated:** December 2024

