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
         
         # Payments (optional)
         PAYSTACK_SECRET_KEY=sk_live_or_test_xxx
         BANK_ACCOUNT_NAME=Raddazle Ltd
         BANK_ACCOUNT_NUMBER=0000000000
         BANK_BANK_NAME=Your Bank Name
         BANK_TRANSFER_INSTRUCTIONS=Use your Order ID as reference.
         
         # Flutterwave (optional)
         FLW_SECRET_KEY=FLWSECK-xxxx
         # Frontend must set REACT_APP_FLW_PUBLIC_KEY=FLWPUBK-xxxx in raddazle-react/.env

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
## Payments

Supported methods:

- Paystack (card/USSD/bank channels) — SPA uses Paystack Inline. Backend needs `PAYSTACK_SECRET_KEY`. Frontend needs `REACT_APP_PAYSTACK_PUBLIC_KEY`.
- Bank Transfer — Shows bank details and lets customer submit a reference and optional proof image. Admin can mark payment as completed from Payments list.
 - Flutterwave — SPA uses Flutterwave Inline. Backend needs `FLW_SECRET_KEY`. Frontend needs `REACT_APP_FLW_PUBLIC_KEY`.

Backend endpoints (selected):

- `POST /api/payments/paystack/init` — initialize a Paystack transaction for an order
- `POST /api/payments/paystack/verify` — verify a Paystack reference and mark order paid
 - `POST /api/payments/flutterwave/init` — init Flutterwave with a generated `txRef`
 - `POST /api/payments/flutterwave/verify` — verify a Flutterwave reference and mark order paid
- `POST /api/payments/:id/refund` (admin) — trigger a refund via the gateway and mark order refunded/cancelled

Webhooks (recommended for resilience)

- Paystack webhook: `POST /api/payments/paystack/webhook`
    - Set URL in Paystack Dashboard.
    - We verify `x-paystack-signature` using `sha512` over the raw JSON body with your `PAYSTACK_SECRET_KEY`.
    - Ensure your server can receive the route publicly.

- Flutterwave webhook: `POST /api/payments/flutterwave/webhook`
    - Set URL and `Secret Hash` in Flutterwave Dashboard (use env `FLW_SECRET_HASH`).
    - We verify the `verif-hash` header equals your `FLW_SECRET_HASH`.

Note: webhooks require raw body parsing for signature verification; these routes are mounted with `express.raw({ type: 'application/json' })` before `express.json()` in `index.js`.

Background reconciliation

- A reconciler runs periodically to re-verify pending card payments by reference (config via env):
    - `PAYMENT_RECON_INTERVAL_MS` (default 300000)
    - `PAYMENT_RECON_MIN_AGE_MS` (default 120000)
    - `PAYMENT_RECON_FAIL_AFTER_MS` (default 86400000)
    - After TTL, pending payments are marked as failed. Successful verifications mark orders paid.
- `GET /api/payments/bank-info` — fetch bank transfer details
- `POST /api/payments/bank-transfer/submit` — submit transfer reference/proof and set order to pending review

Frontend setup:

- Add `REACT_APP_PAYSTACK_PUBLIC_KEY=pk_test_or_live_xxx` to `raddazle-react/.env`.
- `public/index.html` includes `<script src="https://js.paystack.co/v1/inline.js"></script>`.


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


## Super-Admin initialization

To create the first super-admin account, use the provided initializer script that reads credentials from environment variables.

1. Set environment variables (e.g., in `.env`):

```
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=ChangeMe123!
SUPER_ADMIN_NAME=Site Owner
# Optional: if user already exists, reset their password
SUPER_ADMIN_RESET=true
```

2. Run the script:

```
npm run init:super-admin
```

The script will create (or update) a user to role `super-admin`, ensure the account is verified/active, and optionally reset the password if `SUPER_ADMIN_RESET=true`.

Security tip: unset `SUPER_ADMIN_RESET` after running in production.

