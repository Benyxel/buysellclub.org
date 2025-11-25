# Frontend Deployment Setup Guide

## Deployment Platform

This project is configured for **GitHub Pages** deployment.

For complete setup instructions, see:
- `GITHUB_PAGES_SETUP.md` - Complete setup guide
- `MIGRATION_TO_GITHUB_PAGES.md` - Quick migration guide

## Environment Variables

Copy `env.frontend.example` to `.env`, `.env.local`, or `.env.production` and update the values before building. GitHub Actions secrets can mirror the same keys.

To connect the frontend to your Railway backend, you need to set the following environment variable in GitHub Secrets:

### Required Environment Variables

1. **VITE_API_BASE_URL** (Required for production)
   - **Description**: The base URL of your Railway backend API
   - **Example**: `https://your-app-name.up.railway.app`
   - **For local development**: Leave empty (uses Vite proxy to `http://localhost:8000`)
   - **Where to set**: GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

### Optional Environment Variables

2. **VITE_BASE_PATH** (Optional)
   - **Description**: Base path for the application
   - **Default**: `/buysellclubproject`
   - **Example**: `/` or `/buysellclubproject`
   - **Where to set**: GitHub Repository → Settings → Secrets and variables → Actions

## Setting Up in GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: Your Railway backend URL (e.g., `https://your-app-name.up.railway.app`)
5. Click **Add secret**
6. Push to `main` branch to trigger deployment

## Backend CORS Configuration

**⚠️ IMPORTANT: This is a CORS error - you MUST fix this in your Django backend!**

The error shows your backend at `https://buysellclub-backend-production.up.railway.app` is not allowing requests from your GitHub Pages frontend.

### Fix in Django Backend (settings.py)

You need to add `django-cors-headers` if not already installed, and configure it:

1. **Install django-cors-headers** (if not already installed):
```bash
pip install django-cors-headers
```

2. **Add to INSTALLED_APPS in settings.py**:
```python
INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
    # ... rest of apps
]
```

3. **Add CORS middleware** (must be near the top, before CommonMiddleware):
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this
    'django.middleware.common.CommonMiddleware',
    # ... rest of middleware
]
```

4. **Configure CORS settings** (add to settings.py):

**Option A: Allow specific GitHub Pages domains** (Recommended for production):
```python
# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "https://your-username.github.io",  # Your GitHub Pages URL
    # Add your custom domain if you have one:
    # "https://your-custom-domain.com",
]

# Allow credentials (cookies, authorization headers)
CORS_ALLOW_CREDENTIALS = True

# Allow specific headers
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

**Option B: Allow all GitHub Pages URLs** (Useful for multiple repositories):
```python
import os

# CORS Configuration
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.github\.io$",  # Allow all GitHub Pages URLs
]

# Or use environment variable for production domain
CORS_ALLOWED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'https://your-username.github.io'),
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

**Option C: Allow all origins** (⚠️ ONLY for development/testing):
```python
CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ Only use in development!
CORS_ALLOW_CREDENTIALS = True
```

### After Making Changes:

1. **Restart your Railway backend** for changes to take effect
2. **Test the connection** - the CORS error should be resolved
3. **Check Railway logs** if issues persist

### Current Error Details:
- **Frontend Origin**: `https://your-username.github.io` (or your custom domain)
- **Backend URL**: `https://buysellclub-backend-production.up.railway.app`
- **Issue**: Backend is not sending `Access-Control-Allow-Origin` header

## Testing the Connection

After deployment:
1. Open your GitHub Pages site
2. Open browser DevTools → Network tab
3. Try logging in or making an API request
4. Verify that requests are going to your Railway backend URL (not localhost)

## Local Development

For local development, you don't need to set `VITE_API_BASE_URL`. The Vite proxy in `vite.config.js` will automatically forward `/buysellapi/*` requests to `http://localhost:8000`.

