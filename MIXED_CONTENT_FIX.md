# Fix Mixed Content Error (HTTPS/HTTP Issue)

## Problem
Your frontend is on HTTPS (`https://buysellclub.org`) but your backend API URL is HTTP (`http://apibuysellclub.org.buysellclub.org`). Browsers block HTTP requests from HTTPS pages for security.

**Error Message:**
```
Mixed Content: The page at 'https://buysellclub.org/admin-login' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://apibuysellclub.org.buysellclub.org/...'. 
This request has been blocked; the content must be served over HTTPS.
```

## Solution: Use HTTPS for Backend API

You have **two options**:

### Option 1: Enable SSL for Backend Subdomain (Recommended)

1. **Get SSL Certificate for Backend:**
   - In cPanel, go to **SSL/TLS Status**
   - Find your subdomain: `apibuysellclub.org.buysellclub.org`
   - Click **Run AutoSSL** or install a free Let's Encrypt certificate
   - Wait for SSL to be activated (usually takes a few minutes)

2. **Update Frontend API URL to HTTPS:**
   
   **Method A: Runtime Injection (Quick Fix - No Rebuild Needed)**
   
   Edit your `index.html` file in cPanel public_html directory. Add this script in the `<head>` section (before other scripts):
   
   ```html
   <script>
     window.__ENV__ = window.__ENV__ || {};
     window.__ENV__.VITE_API_BASE_URL = "https://apibuysellclub.org.buysellclub.org";
   </script>
   ```
   
   **Method B: Rebuild Frontend (Better - Permanent Fix)**
   
   Create `.env.production` in `frontend/` directory:
   ```env
   VITE_API_BASE_URL=https://apibuysellclub.org.buysellclub.org
   ```
   
   Then rebuild:
   ```bash
   cd frontend
   npm run build
   ```
   
   Upload the new `dist/` folder to cPanel.

3. **Update Backend CORS (Already Done):**
   - The backend `settings.py` already includes `https://apibuysellclub.org.buysellclub.org` in CORS_ALLOWED_ORIGINS ✓
   - Restart your Python app in cPanel after SSL is enabled

4. **Test:**
   - Visit: `https://apibuysellclub.org.buysellclub.org/`
   - Should load without SSL warnings
   - Visit: `https://buysellclub.org/admin-login`
   - Should work without Mixed Content errors

### Option 2: Use HTTP for Frontend (Not Recommended)

If you can't get SSL for the backend, you could switch the frontend to HTTP, but this is **NOT recommended** for security reasons and will hurt SEO.

---

## Quick Fix Steps (If SSL is Already Enabled)

If your backend already has SSL but the frontend is still using HTTP:

1. **Update `index.html` in cPanel:**
   - Open `public_html/index.html` in cPanel File Manager
   - Add this in the `<head>` section:
   ```html
   <script>
     window.__ENV__ = window.__ENV__ || {};
     window.__ENV__.VITE_API_BASE_URL = "https://apibuysellclub.org.buysellclub.org";
   </script>
   ```

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Test:**
   - Open browser DevTools (F12) → Console
   - Type: `window.__ENV__.VITE_API_BASE_URL`
   - Should show: `"https://apibuysellclub.org.buysellclub.org"`
   - Try accessing admin login - should work now

---

## Verify SSL is Working

1. **Test backend SSL:**
   - Visit: `https://apibuysellclub.org.buysellclub.org/`
   - Should show a padlock icon in browser (no SSL warnings)
   - If you see "Not Secure" or SSL errors, SSL is not properly configured

2. **Check SSL certificate:**
   - Click the padlock icon in browser address bar
   - Should show certificate details
   - Certificate should be valid and not expired

---

## Troubleshooting

### SSL Not Working for Backend

1. **Check cPanel SSL/TLS Status:**
   - cPanel → SSL/TLS Status
   - Verify certificate is installed for `apibuysellclub.org.buysellclub.org`

2. **Force HTTPS Redirect (Optional):**
   - In cPanel → Domains → Redirects
   - Redirect `http://apibuysellclub.org.buysellclub.org/*` to `https://apibuysellclub.org.buysellclub.org/$1`
   - Type: Permanent (301)

3. **Contact Hosting Support:**
   - Ask them to enable SSL for your subdomain
   - Most cPanel hosts support free Let's Encrypt certificates

### Still Getting Mixed Content Errors

1. **Check browser console:**
   - Open DevTools (F12) → Console
   - Look for Mixed Content warnings
   - Check which URLs are still using HTTP

2. **Verify API URL:**
   - Console: `window.__ENV__.VITE_API_BASE_URL`
   - Should start with `https://`

3. **Clear browser cache:**
   - Old cached JavaScript might still have HTTP URLs
   - Hard refresh or clear cache completely

---

## Summary

**The fix is simple:**
1. Enable SSL for `apibuysellclub.org.buysellclub.org` in cPanel
2. Update frontend to use `https://apibuysellclub.org.buysellclub.org` instead of `http://`
3. Restart backend Python app
4. Test - Mixed Content errors should be gone!

