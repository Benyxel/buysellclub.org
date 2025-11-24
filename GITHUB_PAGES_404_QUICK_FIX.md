# Quick Fix for GitHub Pages 404 Error

## Most Common Issue: Base Path Mismatch

The base path in `vite.config.js` **MUST** match your repository name exactly.

## Step 1: Find Your Repository Name

1. Go to your GitHub repository
2. Look at the URL: `https://github.com/username/repository-name`
3. Note the `repository-name` part

## Step 2: Update Base Path

Edit `frontend/vite.config.js`:

```js
base: '/your-actual-repository-name',  // Must match exactly
```

**Example:**
- If repo is `buysellclubproject` → `base: '/buysellclubproject'`
- If repo is `my-app` → `base: '/my-app'`
- If using custom domain → `base: '/'`

## Step 3: Set GitHub Secret (Alternative)

Instead of editing the file, you can set a GitHub Secret:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VITE_BASE_PATH`
4. Value: `/your-repository-name` (must start with `/`)

## Step 4: Redeploy

```bash
git add frontend/vite.config.js
git commit -m "Fix base path for GitHub Pages"
git push origin main
```

Or manually trigger deployment:
- Go to **Actions** tab
- Select **Deploy to GitHub Pages**
- Click **Run workflow**

## Step 5: Verify

After deployment, visit:
```
https://your-username.github.io/repository-name/
```

Should load your app (not 404).

## Still Getting 404?

### Check GitHub Actions Logs

1. Go to **Actions** tab
2. Click on the latest workflow run
3. Check the "Build" job logs
4. Look for:
   - "Auto-detected base path: /repository-name"
   - "✓ index.html exists"
   - "✓ 404.html copied to dist"

### Verify Build Output

The workflow now auto-detects your repository name. Check the logs to see what base path was used.

### Common Mistakes

❌ **Wrong:** `base: '/Buysellclubproject'` (wrong case)
✅ **Correct:** `base: '/buysellclubproject'` (exact case)

❌ **Wrong:** `base: 'buysellclubproject'` (missing leading slash)
✅ **Correct:** `base: '/buysellclubproject'` (with leading slash)

❌ **Wrong:** `base: '/buysellclubproject/'` (trailing slash)
✅ **Correct:** `base: '/buysellclubproject'` (no trailing slash)

## Auto-Detection

The GitHub Actions workflow now auto-detects your repository name if `VITE_BASE_PATH` secret is not set. Check the workflow logs to see what was detected.

## Need More Help?

See `GITHUB_PAGES_404_FIX.md` for detailed troubleshooting.

