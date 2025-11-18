# Auto-sync trackings to users - PowerShell Task Scheduler script
# This script runs the Django management command to match trackings

$ErrorActionPreference = "Stop"
$BackendPath = "D:\Companyprojects\backend"

# Change to backend directory
Set-Location $BackendPath

# Activate virtual environment
& "$BackendPath\.venv\Scripts\Activate.ps1"

# Run the sync command
python manage.py auto_sync_trackings

# Exit with command's exit code
exit $LASTEXITCODE
