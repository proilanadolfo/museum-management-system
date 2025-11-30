# 🔄 Backup & Recovery Plan

**Museum Management System**  
**Last Updated:** December 2024  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Procedures](#backup-procedures)
4. [Recovery Procedures](#recovery-procedures)
5. [Verification Checklist](#verification-checklist)
6. [Disaster Recovery](#disaster-recovery)
7. [Backup Schedule](#backup-schedule)
8. [Troubleshooting](#troubleshooting)

---

## 1. Overview

This document outlines the backup and recovery procedures for the Museum Management System. The system uses MongoDB databases and stores uploaded files in the `uploads/` directory.

### System Components

- **Databases:**
  - `museum_admin` - Administrator accounts
  - `museum_superadmin` - Super administrator accounts
  - `museum_bookings` - Bookings, announcements, gallery, settings, audit logs

- **Files:**
  - `uploads/` - User-uploaded images and files (announcements, gallery, logos, profiles)

---

## 2. Recovery Objectives

### RTO (Recovery Time Objective)
**Target: 4 hours**

The system should be restored and operational within 4 hours of a disaster or data loss event.

### RPO (Recovery Point Objective)
**Target: 24 hours**

Maximum acceptable data loss is 24 hours. Daily backups ensure we can restore to within 24 hours of the last backup.

---

## 3. Backup Procedures

### Manual Backup

#### Step 1: Navigate to Backend Directory
```bash
cd backend
```

#### Step 2: Run Backup Script
```bash
# Option 1: Using npm script
npm run backup

# Option 2: Direct node command
node scripts/backup.js
```

#### Step 3: Verify Backup
```bash
# Check backup directory
ls -la backups/

# You should see:
# - museum_admin-YYYY-MM-DD_HH-MM-SS/
# - museum_superadmin-YYYY-MM-DD_HH-MM-SS/
# - museum_bookings-YYYY-MM-DD_HH-MM-SS/
# - uploads-YYYY-MM-DD_HH-MM-SS/
```

### What Gets Backed Up

1. **All 3 MongoDB Databases:**
   - `museum_admin` - All collections exported as JSON files
   - `museum_superadmin` - All collections exported as JSON files
   - `museum_bookings` - All collections exported as JSON files
   - Each collection saved as `{collection_name}.json`
   - Metadata file: `_metadata.json` (contains backup info)

2. **Uploads Directory:**
   - Announcement images
   - Gallery images
   - Profile pictures
   - Logos
   - Mission images

### Backup Location

- **Local:** `backend/backups/`
- **Format:** `{database_name}-{timestamp}/`
- **Example:** `museum_admin-2024-12-20_14-30-00/`
- **File Format:** JSON files (one per collection)

### Backup Retention

- **Automatic Cleanup:** Backups older than 7 days are automatically deleted
- **Manual Cleanup:** Can be done manually if needed

### Prerequisites

- **Node.js and npm:** Already installed (required for the application)
- **MongoDB Connection:** Valid MongoDB Atlas connection strings in `.env`
- **No Additional Tools Required:** The backup script uses Mongoose (already installed) - no need for `mongodump` command

---

## 4. Recovery Procedures

### ⚠️ IMPORTANT WARNINGS

1. **Data Loss:** Restore will **OVERWRITE** existing data using `--drop` flag
2. **Backup Required:** Always create a backup before restoring
3. **System Downtime:** System should be stopped during restore
4. **Verification:** Always verify data after restore

### Recovery Steps

#### Step 1: List Available Backups

```bash
cd backend
node scripts/restore.js list
```

**Output Example:**
```
📦 Available Backups:
==================================================

📅 2024-12-20_14-30-00
   Databases: museum_admin, museum_superadmin, museum_bookings

📅 2024-12-19_14-30-00
   Databases: museum_admin, museum_superadmin, museum_bookings
```

#### Step 2: Stop the Application

**Before restoring, stop the backend server:**
- Press `Ctrl+C` if running in terminal
- Or stop the process/service

#### Step 3: Run Restore Script

```bash
cd backend
node scripts/restore.js <backup-date>
```

**Example:**
```bash
node scripts/restore.js 2024-12-20_14-30-00
```

**What Happens:**
1. Script finds backup directories matching the date
2. Restores all 3 databases (overwrites existing data)
3. Restores uploads directory (replaces existing uploads)
4. Logs all operations

#### Step 4: Verify Restore

See [Verification Checklist](#verification-checklist) below.

#### Step 5: Restart Application

```bash
cd backend
npm start
```

---

## 5. Verification Checklist

After restoring, verify the following:

### ✅ Database Verification

1. **Check Database Connections:**
   ```bash
   # Test connection (if you have MongoDB shell)
   mongosh "mongodb+srv://your-connection-string/museum_admin"
   ```

2. **Verify Data Counts:**
   - [ ] Admin users exist
   - [ ] Super admin users exist
   - [ ] Bookings exist
   - [ ] Audit logs exist
   - [ ] Gallery items exist
   - [ ] Announcements exist

3. **Test Login:**
   - [ ] Super admin can log in
   - [ ] Admin can log in
   - [ ] Passwords work correctly

### ✅ File Verification

1. **Check Uploads Directory:**
   ```bash
   ls -la backend/uploads/
   ```

2. **Verify Files:**
   - [ ] Announcement images exist
   - [ ] Gallery images exist
   - [ ] Profile pictures exist
   - [ ] Logos exist

3. **Test File Access:**
   - [ ] Images load in frontend
   - [ ] No broken image links

### ✅ Application Verification

1. **Backend:**
   - [ ] Server starts without errors
   - [ ] All routes respond correctly
   - [ ] Database connections work

2. **Frontend:**
   - [ ] Pages load correctly
   - [ ] Images display
   - [ ] User authentication works
   - [ ] All features functional

3. **Functionality:**
   - [ ] Can create bookings
   - [ ] Can view gallery
   - [ ] Can manage admins (superadmin)
   - [ ] Can view audit logs (superadmin)

---

## 6. Disaster Recovery

### Scenario 1: Complete Data Loss

**Situation:** All databases and files lost

**Recovery Steps:**
1. Restore from most recent backup
2. Follow [Recovery Procedures](#recovery-procedures)
3. Complete [Verification Checklist](#verification-checklist)
4. Notify users of potential data loss (if backup is old)

### Scenario 2: Partial Data Loss

**Situation:** One database or specific collection corrupted

**Recovery Steps:**
1. Identify affected database/collection
2. Restore only affected database from backup
3. Verify data integrity
4. Check for data inconsistencies

### Scenario 3: Accidental Deletion

**Situation:** Data accidentally deleted by user/admin

**Recovery Steps:**
1. Identify when deletion occurred
2. Find backup from before deletion
3. Restore from that backup
4. Verify restored data
5. Re-apply any legitimate changes made after backup

### Scenario 4: Database Corruption

**Situation:** Database files corrupted, system won't start

**Recovery Steps:**
1. Stop application immediately
2. Attempt to repair (if possible)
3. If repair fails, restore from backup
4. Verify all data restored correctly

---

## 7. Backup Schedule

### Recommended Schedule

#### Production Environment:
- **Daily Backups:** Every day at 2:00 AM (automated)
- **Weekly Backups:** Every Sunday at 2:00 AM (keep for 30 days)
- **Monthly Backups:** First day of month at 2:00 AM (keep for 1 year)

#### Development Environment:
- **Manual Backups:** Before major changes or deployments

### Automated Backup Setup

#### Windows (Task Scheduler):
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `node`
6. Arguments: `C:\path\to\backend\scripts\backup.js`
7. Start in: `C:\path\to\backend`

#### Linux (Cron):
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2:00 AM)
0 2 * * * cd /path/to/backend && node scripts/backup.js >> /var/log/backup.log 2>&1
```

#### macOS (Launchd):
Create `~/Library/LaunchAgents/com.museum.backup.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.museum.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/backend/scripts/backup.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
```

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.museum.backup.plist
```

---

## 8. Troubleshooting

### Issue: Backup Fails

**Symptoms:**
- Error: "Connection timeout"
- Error: "Connection refused"
- Error: "ENOTFOUND" (DNS error)

**Solutions:**
1. **Check MongoDB Connection:**
   - Verify connection strings in `.env` file
   - Ensure MongoDB Atlas cluster is running
   - Test connection: Check if application can connect to databases

2. **Check Network/Firewall:**
   - Ensure MongoDB Atlas IP whitelist includes your IP
   - Check if VPN is blocking connection

3. **Check Permissions:**
   - Ensure write permissions to `backend/backups/` directory
   - Check disk space available

4. **Check Environment Variables:**
   - Verify `.env` file exists in `backend/` directory
   - Ensure all `MONGO_URI_*` variables are set correctly

### Issue: Restore Fails

**Symptoms:**
- Error: "Backup path not found"
- Error: "Invalid backup structure"

**Solutions:**
1. **Verify Backup Exists:**
   ```bash
   node scripts/restore.js list
   ```

2. **Check Backup Date Format:**
   - Use format: `YYYY-MM-DD_HH-MM-SS`
   - Example: `2024-12-20_14-30-00`

3. **Verify Backup Integrity:**
   - Check if backup directories exist
   - Verify backup files are not corrupted

### Issue: Data Missing After Restore

**Symptoms:**
- Some data not restored
- Collections empty

**Solutions:**
1. **Check Backup Date:**
   - Ensure backup was created before data loss
   - Verify backup contains expected data

2. **Verify Restore Process:**
   - Check restore logs for errors
   - Verify all databases restored

3. **Check Database Connections:**
   - Verify `.env` connection strings are correct
   - Test database connections

### Issue: Application Won't Start After Restore

**Symptoms:**
- Server crashes on startup
- Database connection errors

**Solutions:**
1. **Check Logs:**
   ```bash
   # Check backend logs
   tail -f backend/logs/error-*.log
   ```

2. **Verify Environment Variables:**
   - Check `.env` file exists
   - Verify all required variables are set

3. **Test Database Connections:**
   - Verify MongoDB is accessible
   - Check connection strings

---

## 9. Best Practices

### Before Restore:
1. ✅ **Always create a backup** before restoring
2. ✅ **Stop the application** before restore
3. ✅ **Verify backup date** is correct
4. ✅ **Notify team** of planned restore

### After Restore:
1. ✅ **Complete verification checklist**
2. ✅ **Test all critical features**
3. ✅ **Monitor logs** for errors
4. ✅ **Document restore** in audit logs

### Regular Maintenance:
1. ✅ **Test backups regularly** (restore to test environment)
2. ✅ **Monitor backup success** (check logs)
3. ✅ **Review backup retention** policy
4. ✅ **Update recovery plan** as system evolves

---

## 10. Emergency Contacts

**System Administrator:** [Your Name/Contact]  
**Database Administrator:** [DBA Contact]  
**MongoDB Atlas Support:** [If using Atlas]

---

## 11. Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-20 | 1.0 | Initial recovery plan created | System Admin |

---

## Appendix A: Quick Reference

### Backup Command
```bash
cd backend && npm run backup
```

### List Backups
```bash
cd backend && node scripts/restore.js list
```

### Restore Command
```bash
cd backend && node scripts/restore.js <backup-date>
```

### Example Backup Date Format
```
2024-12-20_14-30-00
```

---

**Document Status:** ✅ **ACTIVE**  
**Next Review Date:** March 2025

