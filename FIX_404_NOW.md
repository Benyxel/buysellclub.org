# ⚠️ URGENT: Fix 404 Error - Quick Steps

## The Problem

GitHub Pages is showing a 404 because the **base path doesn't match your repository name**.

## Immediate Fix (2 Steps)

### Step 1: Find Your Repository Name

1. Go to your GitHub repository page
2. Look at the URL: `https://github.com/YOUR-USERNAME/REPOSITORY-NAME`
3. Copy the `REPOSITORY-NAME` part

### Step 2: Update vite.config.js

Open `frontend/vite.config.js` and change line 11:

**FROM:**
```js
base: process.env.VITE_BASE_PATH || '/buysellclubproject',
```

**TO:**
```js
base: process.env.VITE_BASE_PATH || '/YOUR-ACTUAL-REPOSITORY-NAME',
```

Replace `YOUR-ACTUAL-REPOSITORY-NAME` with your actual repository name.

**Example:**
- If your repo is `my-buysellclub` → `base: '/my-buysellclub'`
- If your repo is `buysellclub` → `base: '/buysellclub'`
- If your repo is `buysellclubproject` → keep as is

### Step 3: Commit and Push

```bash
git add frontend/vite.config.js
git commit -m "Fix base path for GitHub Pages"
git push origin main
```

## Alternative: Use GitHub Secret

Instead of editing the file, set a GitHub Secret:

1. Go to repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VITE_BASE_PATH`
4. Value: `/your-repository-name` (must start with `/`)
5. Click **Add secret**
6. Push any commit to trigger rebuild

## Verify It Works

After deployment (check Actions tab), visit:
```
https://your-username.github.io/your-repository-name/
```

Should load your app!

## Still 404?

1. **Check Actions Logs:**
   - Go to **Actions** tab
   - Click latest workflow run
   - Look for "Auto-detected base path: /..."
   - Verify it matches your repo name

2. **Check Repository Name:**
   - Go to repository **Settings** → **General**
   - Verify the repository name
   - It must match the base path exactly (case-sensitive)

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Important Notes

- Base path is **case-sensitive**
- Must start with `/`
- Must NOT end with `/`
- Must match repository name exactly

## Example

If your repository URL is:
```
https://github.com/john/buysellclub
```

Then your base path should be:
```js
base: '/buysellclub'
```

And your site will be at:
```
https://john.github.io/buysellclub/
```

