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
         CLIENT_URL=http://localhost:3000 # used in email links for verify/reset
         OPENAI_API_KEY=sk-...
         OPENAI_MODEL=gpt-4o-mini # optional override

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

## Email Verification & Password Reset

User signup requires email verification. On signup, a 6‑digit code is emailed to the user. They can verify via:

- The code input on the frontend Register page (second step), or
- A direct link in the email that opens the Verify page: `${CLIENT_URL}/verify-email?email=...`

Endpoints

- `POST /api/auth/signup` — create user and send 6‑digit verification code
- `POST /api/auth/verify-email` — body: `{ email, token }` to verify account
- `POST /api/auth/reset-verification` — body: `{ email }` to resend verification code
- `POST /api/auth/forgot-password` — body: `{ email }` to send password reset code
- `POST /api/auth/reset-password` — body: `{ email, token, newPassword }` to reset password

Emails include both the 6‑digit code and a convenience link to the corresponding frontend pages using `CLIENT_URL`:

- Verify: `${CLIENT_URL}/verify-email?email=...`
- Reset: `${CLIENT_URL}/reset-password?email=...&code=...`

Make sure `CLIENT_URL` points at your deployed frontend in production (e.g., `https://app.example.com`).

Useful files

- `index.js` — backend entry (CORS config and routes)
- `utils/logger.js` — centralized logging (winston)
- `utils/openaiClient.js` — OpenAI helper used by the complaint chatbot
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

## Customer-support chatbot

- New authenticated routes under `/api/chatbot` let customers raise complaints and receive AI-powered replies:
    - `POST /api/chatbot/sessions` — start a session (optionally with the first message)
    - `POST /api/chatbot/sessions/:id/messages` — send follow-up messages
    - `POST /api/chatbot/sessions/:id/resolve` — mark a conversation as resolved
    - `GET /api/chatbot/sessions` and `GET /api/chatbot/sessions/:id` — fetch conversation history
- Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) for the assistant. Without it the API will throw an error at startup.
- The React app now ships with a floating “Need help?” chat widget (see `raddazle-react/src/components/ChatWidget.js`). Users must be logged in to chat so the backend can tie complaints to their profile.

