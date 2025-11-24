# API Connection Troubleshooting Guide

## Recent Improvements

The API configuration has been enhanced with:
- ✅ 30-second timeout for all requests
- ✅ Better error messages for connection issues
- ✅ Detailed logging for debugging
- ✅ Connection test utility
- ✅ Improved CORS error detection

## Common Connection Issues

### 1. CORS Errors
**Symptoms:**
```
Access to XMLHttpRequest ... has been blocked by CORS policy
```

**Solution:** Fix CORS in Django backend (see `CORS_FIX_GUIDE.md`)

### 2. Network Errors
**Symptoms:**
```
[API Error] No response received (Network Error)
ERR_NETWORK
```

**Possible Causes:**
- Backend server is down
- Incorrect backend URL
- Network connectivity issues
- Firewall blocking requests

**Solutions:**
1. Verify backend is running: Check Railway dashboard
2. Check `VITE_API_BASE_URL` in Vercel environment variables
3. Test backend URL directly in browser: `https://your-backend.up.railway.app/buysellapi/products/`
4. Check browser console for detailed error logs

### 3. Timeout Errors
**Symptoms:**
```
Request timed out
ETIMEDOUT
```

**Solutions:**
- Backend might be slow or overloaded
- Check Railway backend logs for performance issues
- Increase timeout if needed (currently 30 seconds)

### 4. 405 Method Not Allowed
**Symptoms:**
```
405 (Method Not Allowed)
```

**Solutions:**
- Check if endpoint supports the HTTP method (GET, POST, etc.)
- Verify the URL path is correct
- Check backend URL routing configuration

### 5. 500 Internal Server Error
**Symptoms:**
```
500 (Internal Server Error)
```

**Solutions:**
- Check Railway backend logs for detailed error
- Verify backend dependencies are installed
- Check database connectivity
- Review backend error logs

## Testing API Connection

Use the connection test utility in browser console:

```javascript
import { testConnection } from './api';
testConnection().then(result => console.log(result));
```

Or check the browser console for:
- `[API Config]` - Shows configured baseURL
- `[API]` - Shows each request being made
- `[API Error]` - Shows detailed error information

## Configuration Checklist

### Frontend (Vercel)
- [ ] `VITE_API_BASE_URL` is set correctly
- [ ] Value should be: `https://your-backend.up.railway.app` (no trailing slash)
- [ ] Environment variable is set for Production, Preview, and Development

### Backend (Railway)
- [ ] CORS is configured (see `CORS_FIX_GUIDE.md`)
- [ ] Backend is running and accessible
- [ ] Database is connected
- [ ] All dependencies are installed

## Debugging Steps

1. **Check Browser Console:**
   - Look for `[API Config]` logs
   - Check `[API]` request logs
   - Review `[API Error]` messages

2. **Check Network Tab:**
   - Open DevTools → Network
   - Look for failed requests
   - Check request URL, status, and response

3. **Test Backend Directly:**
   - Open: `https://your-backend.up.railway.app/buysellapi/products/`
   - Should return JSON (even if empty array)

4. **Check Environment Variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Verify `VITE_API_BASE_URL` is set correctly

5. **Check Backend Logs:**
   - Railway Dashboard → Your Service → Logs
   - Look for errors or warnings

## Quick Fixes

### If API_BASE_URL is not set:
```bash
# In Vercel Dashboard:
# Add environment variable:
# Name: VITE_API_BASE_URL
# Value: https://your-backend.up.railway.app
```

### If CORS errors persist:
See `CORS_FIX_GUIDE.md` for Django backend configuration

### If requests timeout:
- Check backend performance
- Verify backend is not overloaded
- Check Railway service status

## Error Message Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ERR_NETWORK` | Cannot reach server | Check backend URL and server status |
| `ETIMEDOUT` | Request took too long | Check backend performance |
| `405` | Method not allowed | Check endpoint supports HTTP method |
| `500` | Server error | Check backend logs |
| `CORS` | Cross-origin blocked | Fix CORS in backend settings |

## Getting Help

If issues persist:
1. Check browser console for detailed logs
2. Check Railway backend logs
3. Verify environment variables are set correctly
4. Test backend URL directly in browser
5. Review `CORS_FIX_GUIDE.md` for CORS issues

