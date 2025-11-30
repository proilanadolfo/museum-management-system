# Automatic Backup Script for Museum Management System
# PowerShell version

# Change to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath ".."
Set-Location $backendPath

# Run backup
Write-Host "Starting automatic backup..." -ForegroundColor Green
npm run backup

# Log result
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logPath = Join-Path $backendPath "backups\backup-log.txt"
Add-Content -Path $logPath -Value "$timestamp - Backup completed"

Write-Host "Backup script finished." -ForegroundColor Green

