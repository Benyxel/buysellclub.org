# CORS Error Fix Guide

## Current Error
```
Access to XMLHttpRequest at 'https://buysellclub-backend-production.up.railway.app/buysellapi/user/register/' 
from origin 'https://buysellclub-3t1elf9mf-buysellclubs-projects.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Quick Fix for Django Backend

### Step 1: Install django-cors-headers
```bash
pip install django-cors-headers
```

### Step 2: Update settings.py

Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
    # ... rest
]
```

Add middleware (MUST be near top, before CommonMiddleware):
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # ← Add this line
    'django.middleware.common.CommonMiddleware',
    # ... rest of middleware
]
```

### Step 3: Add CORS Configuration

**Recommended: Allow all Vercel preview URLs** (since they change with each deployment):
```python
# CORS Configuration
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",  # Matches all *.vercel.app domains
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allow all methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

**Alternative: Specific domains only** (if you have a fixed production domain):
```python
CORS_ALLOWED_ORIGINS = [
    "https://buysellclub-3t1elf9mf-buysellclubs-projects.vercel.app",
    "https://your-production-domain.vercel.app",  # Add your production domain
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### Step 4: Restart Backend
After making these changes, restart your Railway backend service.

### Step 5: Verify
1. Check browser console - CORS error should be gone
2. Check Network tab - requests should succeed
3. Check Railway logs for any errors

## Why This Happens
- Browsers block cross-origin requests for security
- Your frontend (Vercel) and backend (Railway) are on different domains
- Backend must explicitly allow the frontend domain via CORS headers

## Testing
After fixing, try:
- User registration
- User login
- Any API call from the frontend

The 500 error you're seeing might also be related - check Railway logs after fixing CORS.

