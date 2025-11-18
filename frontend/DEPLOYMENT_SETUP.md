# Frontend Deployment Setup Guide

## Environment Variables

To connect the frontend to your Railway backend, you need to set the following environment variable in Vercel:

### Required Environment Variables

1. **VITE_API_BASE_URL** (Required for production)
   - **Description**: The base URL of your Railway backend API
   - **Example**: `https://your-app-name.up.railway.app`
   - **For local development**: Leave empty (uses Vite proxy to `http://localhost:8000`)
   - **Where to set**: Vercel Dashboard → Your Project → Settings → Environment Variables

### Optional Environment Variables

2. **VITE_BASE_PATH** (Optional)
   - **Description**: Base path for the application
   - **Default**: `/buysellclubproject`
   - **Example**: `/` or `/buysellclubproject`

## Setting Up in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: Your Railway backend URL (e.g., `https://your-app-name.up.railway.app`)
   - **Environments**: Select Production, Preview, and Development
4. Click **Save**
5. **Redeploy** your application for the changes to take effect

## Backend CORS Configuration

Make sure your Railway backend has CORS configured to allow requests from your Vercel domain:

```python
# In your Django settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-vercel-app.vercel.app",
    "https://your-custom-domain.com",  # if you have one
]
```

Or for development/testing:
```python
CORS_ALLOW_ALL_ORIGINS = True  # Only for development
```

## Testing the Connection

After deployment:
1. Open your Vercel site
2. Open browser DevTools → Network tab
3. Try logging in or making an API request
4. Verify that requests are going to your Railway backend URL (not localhost)

## Local Development

For local development, you don't need to set `VITE_API_BASE_URL`. The Vite proxy in `vite.config.js` will automatically forward `/buysellapi/*` requests to `http://localhost:8000`.

