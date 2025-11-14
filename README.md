# E-commerce-REST-API
E-commerce REST API built with Node.js, Express and MongoDB.

## Quickstart — run backend + frontend in development

1. Backend

     - Install dependencies (already done):

         npm install

     - Create a `.env` in the backend root and set at minimum:

         MONGO_URI=your_mongodb_connection_string
         JWT_SECRET=some_long_secret
         EMAIL_HOST=...
         EMAIL_PORT=...
         EMAIL_USER=...
         EMAIL_PASSWORD=...
         EMAIL_FROM=...
         EMAIL_FROM_NAME=...
         CORS_ORIGIN=http://localhost:3000

     - Start backend (dev):

         npm run dev

     The backend will default CORS origin to `http://localhost:3000` if `CORS_ORIGIN` is not set.

2. Frontend (raddazle)

     - Change to the frontend folder and install:

         cd raddazle
         npm install

     - By default the frontend uses a Vite dev server on port 3000 and proxies `/api` to the backend (see `vite.config.js`).

     - Optionally set the API base in the frontend using an env var `VITE_API_URL` (e.g. `VITE_API_URL=http://localhost:5000/api`). If unset the frontend will default to `http://localhost:5000/api`.

     - Start frontend dev server:

         npm run dev

Notes about authentication and cookies

- The backend sets an httpOnly cookie for the JWT. The frontend axios instance is configured with `withCredentials: true` so cookies are sent on requests.
- For token-in-header flows the frontend still reads a local token from localStorage and sets the `Authorization` header. Both approaches are supported.
- Ensure `CORS_ORIGIN` on the backend includes your frontend host when running in production.

Useful files

- `index.js` — backend entry (CORS config and routes)
- `utils/logger.js` — centralized logging (winston)
- `raddazle/vite.config.js` — frontend dev proxy for `/api` -> backend
- `raddazle/src/services/api.js` — axios instance (now uses withCredentials)

Next steps you can do (optional)

- Add request-level logging (morgan or express-winston).
- Add log rotation (winston-daily-rotate-file) for production.
- Secure production cookies further (set proper domain, secure=true and sameSite as needed).



## Admin UI (static) and API endpoints

This repository now includes a minimal static Admin UI inside `raddazle-frontend` to manage users and view dashboard stats.

Pages

- `raddazle-frontend/admin-login.html` — Log in and obtain the auth cookie
- `raddazle-frontend/admin-dashboard.html` — View user/product/order stats and recent orders
- `raddazle-frontend/admin-users.html` — Search/filter users, update roles/status, perform bulk actions, export CSV

Notes

- The Admin UI expects the API to be reachable under the same origin at `/api` and will send cookies with `credentials: include`.
- Ensure the backend `CORS_ORIGIN` includes the frontend origin if serving from a different host/port.
- Admin-only routes are protected by `protect` + `admin` middleware and accept either cookie-based JWT (preferred) or `Authorization: Bearer <token>`.

Key admin endpoints

- `GET /api/admin/dashboard` — Aggregated stats (users/products/orders/revenue)
- `GET /api/admin/users` — List users with filters/pagination
- `PUT /api/admin/users/:id` — Update role/status/flags
- `POST /api/admin/users/bulk` — Bulk activate/suspend/deactivate/delete
- `GET /api/admin/users/export` — CSV export of users

