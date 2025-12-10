# Admin Page & Dashboard Access Troubleshooting Guide

## Quick Checklist

- [ ] `.htaccess` file is uploaded to your cPanel public_html directory
- [ ] Frontend API URL is correctly configured
- [ ] Backend CORS allows your frontend domain
- [ ] Backend is running and accessible
- [ ] Browser console shows no errors
- [ ] Network tab shows API requests are being made

---

## Issue 1: Cannot Access `/admin-login` or `/admin-dashboard` (404 or Blank Page)

### Symptoms
- Visiting `https://buysellclub.org/admin-login` shows 404 or blank page
- URL changes but page doesn't load
- Browser shows "Cannot GET /admin-login"

### Root Cause
React Router (client-side routing) requires server configuration to redirect all routes to `index.html`. Without this, Apache tries to find a physical `/admin-login` directory/file, which doesn't exist.

### Solution

1. **Upload `.htaccess` file to cPanel:**
   - Location: `buysellclubproject/frontend/.htaccess`
   - Upload to: Your cPanel `public_html` directory (or subdomain directory)
   - Make sure the file is named exactly `.htaccess` (with the dot at the beginning)

2. **Verify file is uploaded:**
   - In cPanel File Manager, enable "Show Hidden Files" (gear icon → Show Hidden Files)
   - You should see `.htaccess` in your public_html directory

3. **Test the routes:**
   - Visit `https://buysellclub.org/admin-login`
   - Should load the admin login page
   - Visit `https://buysellclub.org/admin-dashboard` (after logging in)
   - Should load the admin dashboard

---

## Issue 2: Admin Login Fails or Shows CORS Error

### Symptoms
- Login form loads but submission fails
- Browser console shows: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- Network tab shows CORS preflight errors

### Root Cause
Backend CORS configuration doesn't allow requests from your frontend domain.

### Solution

1. **Check backend CORS settings:**
   - File: `buysellclub-backend/backend/bsbackend/settings.py`
   - Verify `CORS_ALLOWED_ORIGINS` includes your frontend domain:
     ```python
     CORS_ALLOWED_ORIGINS = [
         "https://buysellclub.org",  # Your frontend domain
         "http://apibuysellclub.org.buysellclub.org",  # Your backend domain
         # ... other origins
     ]
     ```

2. **Set environment variable on cPanel:**
   - In cPanel → Python App → Environment Variables
   - Add: `FRONTEND_URL=https://buysellclub.org`
   - This will automatically add it to `CORS_ALLOWED_ORIGINS`

3. **Restart your Python app:**
   - In cPanel → Python App → Restart

4. **Test again:**
   - Open browser DevTools (F12) → Console tab
   - Try logging in
   - Should see no CORS errors

---

## Issue 3: API Requests Fail (404 or Network Error)

### Symptoms
- Login form loads but API calls fail
- Browser console shows: `Failed to fetch` or `404 Not Found`
- Network tab shows requests going to wrong URL

### Root Cause
Frontend API URL is not configured correctly.

### Solution

1. **Check current API configuration:**
   - Open browser DevTools (F12) → Console
   - Type: `window.__ENV__` and press Enter
   - Should show: `{VITE_API_BASE_URL: "http://apibuysellclub.org.buysellclub.org"}`

2. **Option A: Rebuild frontend with correct API URL**
   - Create `.env.production` in `frontend/` directory:
     ```env
     VITE_API_BASE_URL=http://apibuysellclub.org.buysellclub.org
     ```
   - Rebuild: `cd frontend && npm run build`
   - Upload new `dist/` folder to cPanel

3. **Option B: Use runtime injection (if already deployed)**
   - Edit `index.html` in your cPanel public_html directory
   - Add this script in the `<head>` section (before other scripts):
     ```html
     <script>
       window.__ENV__ = window.__ENV__ || {};
       window.__ENV__.VITE_API_BASE_URL = "http://apibuysellclub.org.buysellclub.org";
     </script>
     ```

4. **Verify API URL:**
   - Open browser DevTools (F12) → Network tab
   - Try logging in
   - Check the request URL - should be: `http://apibuysellclub.org.buysellclub.org/buysellapi/token/`

---

## Issue 4: "Access Denied" After Login

### Symptoms
- Login succeeds but redirected to home page
- Toast message: "Access Denied: You don't have permission to access the admin dashboard"
- User role is not "admin"

### Root Cause
The user account doesn't have admin role, or the role check is failing.

### Solution

1. **Check user role in Django admin:**
   - Access Django admin: `http://apibuysellclub.org.buysellclub.org/admin/`
   - Go to: Users → Select your user
   - Check if user has admin privileges (is_staff, is_superuser)

2. **Verify role via API:**
   - After logging in, open browser DevTools (F12) → Console
   - Type: `localStorage.getItem('token')` (should show token)
   - Check Network tab for `/buysellapi/users/me/` request
   - Response should include: `"role": "admin"`

3. **If role is not admin:**
   - In Django admin, edit the user
   - Set `is_staff = True` and `is_superuser = True`
   - Or check your custom role assignment logic

---

## Issue 5: Backend Not Accessible

### Symptoms
- All API requests fail
- Cannot access `http://apibuysellclub.org.buysellclub.org/`
- Connection timeout or "This site can't be reached"

### Root Cause
Backend Django app is not running or not accessible.

### Solution

1. **Check Python app status in cPanel:**
   - cPanel → Python App
   - Verify app is "Running"
   - If not, click "Restart"

2. **Check backend logs:**
   - cPanel → Python App → Logs
   - Look for errors or exceptions

3. **Test backend directly:**
   - Visit: `http://apibuysellclub.org.buysellclub.org/`
   - Should show Django root view or API response
   - Visit: `http://apibuysellclub.org.buysellclub.org/admin/`
   - Should show Django admin login

4. **Verify environment variables:**
   - cPanel → Python App → Environment Variables
   - Check:
     - `ALLOWED_HOSTS=apibuysellclub.org.buysellclub.org,*.buysellclub.org`
     - `BACKEND_URL=http://apibuysellclub.org.buysellclub.org`
     - `FRONTEND_URL=https://buysellclub.org`
     - `DB_MODE=production`
     - Database credentials (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST)

---

## Issue 6: Mixed Content Warnings (HTTP/HTTPS)

### Symptoms
- Frontend is on HTTPS (`https://buysellclub.org`)
- Backend is on HTTP (`http://apibuysellclub.org.buysellclub.org`)
- Browser blocks requests or shows mixed content warnings

### Solution

1. **Option A: Use HTTPS for backend (Recommended)**
   - Get SSL certificate for backend subdomain
   - Update `VITE_API_BASE_URL` to use `https://`
   - Update backend `CORS_ALLOWED_ORIGINS` to use `https://`

2. **Option B: Allow mixed content (Not Recommended)**
   - Only for testing - not secure for production
   - Browser settings → Allow insecure content (not recommended)

---

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Common errors:
   - CORS errors → Backend CORS configuration
   - Network errors → API URL or backend not running
   - 404 errors → Routing or API endpoint issues

### Step 2: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to access admin page or login
4. Check requests:
   - Status codes (200 = success, 404 = not found, 500 = server error)
   - Request URLs (should match your API URL)
   - Response data (check for error messages)

### Step 3: Verify Configuration
1. **Frontend:**
   - Check `window.__ENV__.VITE_API_BASE_URL` in browser console
   - Should be: `http://apibuysellclub.org.buysellclub.org`

2. **Backend:**
   - Check Django admin is accessible
   - Check API endpoint: `http://apibuysellclub.org.buysellclub.org/buysellapi/users/me/`
   - Should return JSON (may require authentication)

### Step 4: Test API Directly
Use curl or Postman to test backend:
```bash
# Test root endpoint
curl http://apibuysellclub.org.buysellclub.org/

# Test API endpoint (may require auth)
curl http://apibuysellclub.org.buysellclub.org/buysellapi/users/me/
```

---

## Common Error Messages & Solutions

| Error Message | Solution |
|--------------|----------|
| `Cannot GET /admin-login` | Upload `.htaccess` file to cPanel |
| `CORS policy: No 'Access-Control-Allow-Origin'` | Add frontend domain to `CORS_ALLOWED_ORIGINS` |
| `Failed to fetch` | Check API URL and backend accessibility |
| `404 Not Found` | Verify API endpoint exists and URL is correct |
| `401 Unauthorized` | Check authentication token and user credentials |
| `Access Denied` | Verify user has admin role in Django admin |
| `Mixed Content` | Use HTTPS for both frontend and backend |

---

## Still Having Issues?

1. **Check backend logs:**
   - cPanel → Python App → Logs
   - Look for Django errors or exceptions

2. **Check frontend build:**
   - Verify `dist/` folder was uploaded correctly
   - Check `index.html` exists in public_html root

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

4. **Test in incognito/private mode:**
   - Rules out browser extension or cache issues

5. **Verify file permissions:**
   - `.htaccess` should be readable (644 permissions)
   - All files in `dist/` should be readable

---

## Quick Fix Commands (if you have SSH access)

```bash
# Check if .htaccess exists
ls -la ~/public_html/.htaccess

# Check backend is running
curl http://apibuysellclub.org.buysellclub.org/

# Check Django migrations
cd ~/apibuysellclub/backend
python3.11 manage.py showmigrations

# Restart Python app (if using Passenger)
touch ~/apibuysellclub/backend/passenger_wsgi.py
```

