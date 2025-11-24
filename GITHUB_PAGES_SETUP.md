# GitHub Pages Deployment Guide

This guide will help you deploy your frontend to GitHub Pages instead of Vercel.

## Prerequisites

1. Your code must be in a GitHub repository
2. You need admin access to the repository
3. GitHub Pages must be enabled for your repository

## Step 1: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **GitHub Actions** (recommended - uses the workflow we created)
   - Or **Deploy from a branch** → Select `gh-pages` branch and `/ (root)` folder

## Step 2: Set Up GitHub Secrets

GitHub Pages uses **Secrets** instead of environment variables:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

### Required Secrets:

**VITE_API_BASE_URL**
- Name: `VITE_API_BASE_URL`
- Value: Your backend URL (e.g., `https://buysellclub-backend-production.up.railway.app`)
- ⚠️ **Important**: Include the full URL with `https://`

**VITE_BASE_PATH** (Optional)
- Name: `VITE_BASE_PATH`
- Value: Your repository name (e.g., `/buysellclubproject`)
- If not set, defaults to `/buysellclubproject`
- For custom domain, use `/`

## Step 3: Update Repository Name in vite.config.js

If your repository name is different from `buysellclubproject`, update the base path:

1. Open `frontend/vite.config.js`
2. Update the `base` path to match your repository name:
   ```js
   base: '/your-repository-name'
   ```

Or if using a custom domain:
```js
base: '/'
```

## Step 4: Deploy

### Automatic Deployment (Recommended)

1. Push your code to the `main` branch (or your default branch)
2. GitHub Actions will automatically:
   - Build your project
   - Deploy to GitHub Pages
3. Check the **Actions** tab in your repository to see the deployment progress

### Manual Deployment

1. Go to **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

## Step 5: Access Your Site

After deployment, your site will be available at:
- `https://your-username.github.io/repository-name/`
- Or your custom domain if configured

## Custom Domain Setup (Optional)

1. Go to repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain (e.g., `buysellclub.com`)
3. Follow GitHub's instructions to configure DNS
4. Update `vite.config.js` base path to `/`
5. Update `VITE_BASE_PATH` secret to `/`

## Troubleshooting

### Build Fails

1. Check **Actions** tab for error messages
2. Verify all secrets are set correctly
3. Check Node.js version compatibility
4. Review build logs for specific errors

### 404 Errors on Routes

If you get 404 errors when navigating:
- This is normal for SPAs on GitHub Pages
- GitHub Pages doesn't support client-side routing by default
- Solution: Add a `404.html` file (see below)

### Assets Not Loading

1. Check if base path is correct in `vite.config.js`
2. Verify all assets are in the `public` folder
3. Check browser console for 404 errors

## Fixing 404 Errors for React Router

Create `frontend/public/404.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>BuySellClub</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // https://github.com/rafgraph/spa-github-pages
      var pathSegmentsToKeep = 1;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
```

Then update `frontend/index.html` to add this script before the closing `</body>` tag:

```html
<script type="text/javascript">
  // Single Page Apps for GitHub Pages
  (function(l) {
    if (l.search[1] === '/' ) {
      var decoded = l.search.slice(1).split('&').map(function(s) { 
        return s.replace(/~and~/g, '&')
      }).join('?');
      window.history.replaceState(null, null,
          l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>
```

## Environment Variables Reference

| Variable | GitHub Secret Name | Example Value | Required |
|----------|-------------------|---------------|----------|
| Backend URL | `VITE_API_BASE_URL` | `https://your-backend.up.railway.app` | Yes |
| Base Path | `VITE_BASE_PATH` | `/repository-name` | No |

## Deployment Features

| Feature | GitHub Pages |
|---------|--------------|
| Environment Variables | GitHub Secrets |
| Custom Domain | Requires DNS config |
| Build Time | Via GitHub Actions |
| Preview Deployments | Manual via Actions |
| HTTPS | Automatic |
| Free Tier | Unlimited |

## Migration Checklist

- [ ] Code pushed to GitHub repository
- [ ] GitHub Pages enabled
- [ ] GitHub Secrets configured (`VITE_API_BASE_URL`, `VITE_BASE_PATH`)
- [ ] `vite.config.js` base path updated
- [ ] `404.html` created (for SPA routing)
- [ ] First deployment successful
- [ ] Site accessible at GitHub Pages URL
- [ ] All API calls working
- [ ] CORS configured in backend (see `CORS_FIX_GUIDE.md`)

## Need Help?

1. Check GitHub Actions logs for build errors
2. Review browser console for runtime errors
3. Verify all secrets are set correctly
4. Ensure backend CORS is configured (see `CORS_FIX_GUIDE.md`)

