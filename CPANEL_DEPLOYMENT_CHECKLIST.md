# cPanel Deployment Checklist

## Backend URL
**Backend API**: `https://apibuysellclub.org.buysellclub.org/` (Use HTTPS to avoid Mixed Content errors)

---

## ✅ Pre-Deployment Settings

### 1. Frontend Environment Configuration

#### Option A: Build with Environment Variable (Recommended)

Create a `.env.production` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=https://apibuysellclub.org.buysellclub.org
VITE_BASE_PATH=/
```

**Note**: 
- Use `http://` (not `https://`) if your backend doesn't have SSL
- Use `https://` if your backend has SSL certificate
- Remove trailing slash from the URL

#### Option B: Runtime Injection (If you can't rebuild)

If you've already built the frontend and can't rebuild, add this script to your `index.html` file in the `<head>` section (before the main bundle):

```html
<script>
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.VITE_API_BASE_URL = "https://apibuysellclub.org.buysellclub.org";
</script>
```

### 2. Build the Frontend

Navigate to the `frontend/` directory and run:

```bash
cd frontend
npm install
npm run build
```

This will create a `dist/` folder with all the production files.

### 3. Upload to cPanel

1. **Upload the `dist/` folder contents** to your cPanel public_html directory (or subdomain directory)
2. **Ensure `index.html` is in the root** of your public directory
3. **Upload all assets** (CSS, JS, images) maintaining the folder structure

### 4. Backend CORS Configuration (CRITICAL)

⚠️ **You MUST configure your Django backend to allow requests from your frontend domain!**

In your Django backend `settings.py`, add your frontend domain to CORS settings:

```python
# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://your-frontend-domain.com",  # Replace with your actual frontend domain
    "https://your-frontend-domain.com",  # If using HTTPS
    # Add www version if needed:
    # "http://www.your-frontend-domain.com",
    # "https://www.your-frontend-domain.com",
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

**Important**: Replace `your-frontend-domain.com` with your actual frontend domain (e.g., `buysellclub.org` or `www.buysellclub.org`)

### 5. Backend Environment Variables

Ensure your backend has these environment variables set:

```env
FRONTEND_URL=http://your-frontend-domain.com  # Your frontend domain
BACKEND_URL=https://apibuysellclub.org.buysellclub.org
ALLOWED_HOSTS=apibuysellclub.org.buysellclub.org,*.buysellclub.org
DEBUG=False  # Set to False in production!
```

---

## 📋 Quick Checklist

- [ ] Created `.env.production` file with `VITE_API_BASE_URL=https://apibuysellclub.org.buysellclub.org`
- [ ] Built frontend with `npm run build`
- [ ] Uploaded `dist/` folder contents to cPanel
- [ ] Configured backend CORS to allow your frontend domain
- [ ] Set backend `FRONTEND_URL` environment variable
- [ ] Set backend `ALLOWED_HOSTS` to include `apibuysellclub.org.buysellclub.org`
- [ ] Set backend `DEBUG=False` for production
- [ ] Tested API connection from frontend

---

## 🧪 Testing After Deployment

1. **Open your frontend website** in a browser
2. **Open Developer Tools** (F12) → **Console** tab
3. **Check for CORS errors** - you should NOT see any
4. **Try logging in** or making an API request
5. **Check Network tab** - verify requests are going to `https://apibuysellclub.org.buysellclub.org/buysellapi/...`

---

## 🔧 Troubleshooting

### CORS Errors
- **Error**: `Access to fetch at 'https://apibuysellclub.org.buysellclub.org/...' from origin '...' has been blocked by CORS policy`
- **Solution**: Add your frontend domain to `CORS_ALLOWED_ORIGINS` in backend `settings.py`

### API Not Found (404)
- **Error**: `404 Not Found` when calling API
- **Solution**: Verify `VITE_API_BASE_URL` is set correctly and backend is accessible

### Mixed Content Warnings
- **Error**: Mixed content (HTTP/HTTPS) warnings
- **Solution**: Use `https://` for `VITE_API_BASE_URL` if your frontend is on HTTPS, or ensure backend has SSL

### Environment Variable Not Working
- **Issue**: Frontend still using localhost or wrong URL
- **Solution**: 
  - Rebuild the frontend after setting `.env.production`
  - Or use runtime injection method (Option B above)
  - Clear browser cache

---

## 📝 Notes

- **Base Path**: If your site is in a subdirectory (e.g., `/buysellclubproject/`), set `VITE_BASE_PATH=/buysellclubproject` in `.env.production`
- **SSL**: ⚠️ **REQUIRED** - Your frontend is on HTTPS, so backend MUST use HTTPS to avoid Mixed Content errors. Use `https://apibuysellclub.org.buysellclub.org`
- **Trailing Slash**: Don't include trailing slash in `VITE_API_BASE_URL` (e.g., use `http://apibuysellclub.org.buysellclub.org` not `http://apibuysellclub.org.buysellclub.org/`)

