# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Production / Live mode and 404 errors

If you see **"Failed to load resource: the server responded with a status of 404"** in live or production:

1. **Set the API base URL** – In `.env.production` set `VITE_API_BASE_URL` to your backend URL (e.g. `VITE_API_BASE_URL=https://apibuysellclub.org`). Rebuild after changing.
2. **See which URL failed** – Open the browser console (F12 → Console). On 404 the app logs `[API] 404 Not Found: <full URL>`. The Analytics page also shows this URL when trends or analytics fail.
3. **Backend routes** – Ensure the deployed backend serves `/buysellapi/` and `/api/` (e.g. `/buysellapi/admin/analytics/trends/`, `/api/admin/containers`, `/api/admin/container-expenses`). The container-expenses API is implemented in the backend (buysellclub-backend: `buysellapi.views.AdminContainerExpenseListView` / `AdminContainerExpenseDetailView`, `bsbackend.urls`).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
