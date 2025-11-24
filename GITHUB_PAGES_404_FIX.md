# Fixing 404 Errors on GitHub Pages

## Common Causes

1. **Wrong Base Path** - Base path doesn't match repository name
2. **404.html Not Copied** - 404.html not in build output
3. **Path Segments Mismatch** - 404.html pathSegmentsToKeep doesn't match base path

## Quick Fix Steps

### 1. Check Your Repository Name

Your GitHub Pages URL is:
```
https://your-username.github.io/repository-name/
```

The `repository-name` must match your `base` path in `vite.config.js`

### 2. Update Base Path

Edit `frontend/vite.config.js`:

```js
base: '/your-actual-repository-name',  // Must match your repo name
```

Or set `VITE_BASE_PATH` GitHub Secret to `/your-repository-name`

### 3. Update 404.html Base Path

Edit `frontend/public/404.html` and change:
```js
var basePath = '/your-actual-repository-name';  // Must match repo name
```

### 4. Verify Build Output

After building, check that:
- `frontend/dist/index.html` exists
- `frontend/dist/404.html` exists (copied by workflow)

### 5. Test Locally

```bash
cd frontend
npm run build
npm run preview
```

Visit `http://localhost:4173/your-repository-name/` and test navigation

## Troubleshooting

### Still Getting 404?

1. **Check GitHub Actions Logs**
   - Go to Actions tab
   - Check if build succeeded
   - Verify 404.html was copied

2. **Check Base Path**
   ```bash
   # In browser console, check:
   console.log(import.meta.env.BASE_URL)
   ```

3. **Check Repository Name**
   - Go to repository Settings
   - Check repository name matches base path

4. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### For Custom Domain

If using a custom domain:
- Set `base: '/'` in `vite.config.js`
- Set `VITE_BASE_PATH` secret to `/`
- Update `404.html` basePath to `/`
- Set pathSegmentsToKeep to `0`

## Verification Checklist

- [ ] Repository name matches base path
- [ ] `vite.config.js` base path is correct
- [ ] `404.html` basePath matches repository name
- [ ] GitHub Secret `VITE_BASE_PATH` is set (if different from default)
- [ ] Build succeeded in GitHub Actions
- [ ] `404.html` was copied to dist (check Actions logs)
- [ ] Site accessible at correct URL

## Example Configuration

For repository named `buysellclubproject`:

**vite.config.js:**
```js
base: '/buysellclubproject',
```

**404.html:**
```js
var basePath = '/buysellclubproject';
var pathSegmentsToKeep = 1;
```

**GitHub Secret:**
```
VITE_BASE_PATH = /buysellclubproject
```

## Still Having Issues?

1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify all files are in `dist` folder
4. Check GitHub Pages settings (Settings → Pages)
5. Review GitHub Actions workflow logs

