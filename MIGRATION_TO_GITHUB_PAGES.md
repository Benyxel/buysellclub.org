# GitHub Pages Deployment Guide

## What Has Been Set Up

✅ GitHub Actions workflow (`.github/workflows/deploy.yml`)
✅ Updated `vite.config.js` for GitHub Pages
✅ Created `404.html` for SPA routing
✅ Updated `index.html` with routing script
✅ Added deployment script to `package.json`
✅ Created setup documentation (`GITHUB_PAGES_SETUP.md`)

## Quick Start (5 Steps)

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

### 2. Enable GitHub Pages
- Go to your repository on GitHub
- **Settings** → **Pages**
- Under **Source**, select **GitHub Actions**

### 3. Set GitHub Secrets
Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

**VITE_API_BASE_URL**
```
Name: VITE_API_BASE_URL
Value: https://buysellclub-backend-production.up.railway.app
```

**VITE_BASE_PATH** (Optional - only if your repo name is different)
```
Name: VITE_BASE_PATH
Value: /your-repository-name
```

### 4. Update Base Path (If Needed)

If your repository name is NOT `buysellclubproject`, update `frontend/vite.config.js`:

```js
base: '/your-actual-repository-name',
```

### 5. Deploy

**Automatic:** Push to `main` branch - GitHub Actions will deploy automatically

**Manual:** Go to **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

## Your Site URL

After deployment, your site will be at:
```
https://your-username.github.io/repository-name/
```

## Important Notes

### Environment Variables
- ✅ GitHub Pages: Set as **GitHub Secrets** (Settings → Secrets and variables → Actions)

### Base Path
- Make sure `vite.config.js` base path matches your repository name
- Or set `VITE_BASE_PATH` secret

### CORS
- Still need to configure CORS in your Django backend
- See `CORS_FIX_GUIDE.md` for details

### Routing
- `404.html` and routing script in `index.html` handle SPA routing
- This is required for React Router to work on GitHub Pages

## Troubleshooting

### Build Fails
1. Check **Actions** tab for errors
2. Verify secrets are set correctly
3. Check Node.js version in workflow (currently 20)

### 404 on Routes
- Normal for first-time setup
- `404.html` should fix this
- If not, check base path configuration

### Assets Not Loading
- Verify base path in `vite.config.js`
- Check browser console for 404 errors
- Ensure assets are in `public` folder

## Next Steps

1. ✅ Code pushed to GitHub
2. ✅ GitHub Pages enabled
3. ✅ Secrets configured
4. ✅ First deployment successful
5. ⚠️ Test all features
6. ⚠️ Update CORS in backend if needed
7. ⚠️ Set up custom domain (optional)

## Need Help?

See `GITHUB_PAGES_SETUP.md` for detailed documentation.

