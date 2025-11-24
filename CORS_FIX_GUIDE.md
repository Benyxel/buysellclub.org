# CORS Error Fix Guide

## Current Error
```
Access to XMLHttpRequest at 'https://buysellclub-backend-production.up.railway.app/buysellapi/user/register/' 
from origin 'https://your-username.github.io' 
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

**Recommended: Allow all GitHub Pages URLs** (useful for multiple repositories):
```python
# CORS Configuration
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.github\.io$",  # Matches all *.github.io domains
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
    "https://your-username.github.io",  # Your GitHub Pages URL
    "https://your-custom-domain.com",  # Add your custom domain if you have one
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

