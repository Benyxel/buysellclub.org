@echo off
REM Auto-sync trackings to users - Windows Task Scheduler script
REM This script runs the Django management command to match trackings

cd /d D:\Companyprojects\backend
call .venv\Scripts\activate.bat
python manage.py auto_sync_trackings >> logs\auto_sync.log 2>&1

REM Exit codes:
REM 0 = Success
REM 1 = Error
exit /b %ERRORLEVEL%
