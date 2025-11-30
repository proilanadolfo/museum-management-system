@echo off
REM Automatic Backup Script for Museum Management System
REM This script runs the backup process

cd /d "%~dp0\.."
call npm run backup

REM Log the backup execution
echo Backup completed at %date% %time% >> backups\backup-log.txt

