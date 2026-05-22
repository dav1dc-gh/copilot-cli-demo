# Copilot Instructions

## Commands

- **Start server:** `npm start` (runs `node server.js`, default port 3000)
- **No test suite, linter, or build step exists.** There is no `npm test`, `npm run lint`, or `npm run build` configured.

## Architecture

Single-file Express 5 server (`server.js`) serving a vanilla HTML/CSS/JS frontend from `public/`. No build step, no bundler, no framework on the frontend.

- **Backend:** `server.js` — routes, middleware, and validation; `db.js` — SQLite database layer
- **Frontend:** `public/index.html`, `public/script.js`, `public/styles.css` — plain DOM manipulation, no frameworks
- **Database:** SQLite via `better-sqlite3`, file stored at `DB_PATH` (default: `./feedback.db`)

The app is a feedback form. Users submit feedback via `POST /submit-feedback` (JSON). Admins view submissions via `GET /feedback` (Basic Auth protected). Data persists in SQLite.

### Database (`db.js`)

- Auto-creates the `feedback` table on startup if it doesn't exist
- Uses WAL journal mode for better read performance
- Restricts DB file permissions to owner-only (`chmod 600`) on startup
- Synchronous API (better-sqlite3) — no async/await needed for DB calls
- Exports:
  - `insertFeedback({ name, email, rating, comments, recommend, timestamp })` — returns the inserted row
  - `getAllFeedback({ limit, offset })` — paginated, ordered by newest first
  - `getFeedbackCount()` — total row count
  - `close()` — closes the DB connection (used in graceful shutdown)

## Key Conventions

### Security patterns

- All user string inputs must be sanitized with the `sanitize()` helper (HTML entity escaping) before storage
- All user string inputs must have type checks (`typeof === 'string'`) and length limits enforced server-side
- Protected endpoints use the `basicAuth` middleware, which reads credentials from `AUTH_USER`/`AUTH_PASS` environment variables
- Request body size is capped at 10kb via Express parser options
- `helmet` is used for security headers; `express-rate-limit` for submission throttling

### API response format

All JSON responses follow this shape:

```json
{ "success": true|false, "message": "...", ...optional fields }
```

### Environment variables

Required env vars for full functionality (auto-loaded from `.env` via `dotenv`):

- `PORT` — server port (default: 3000)
- `AUTH_USER` — username for `/feedback` endpoint
- `AUTH_PASS` — password for `/feedback` endpoint
- `DB_PATH` — path to SQLite database file (default: `./feedback.db`)
- `NODE_ENV` — set to `production` to enable HTTPS redirect

### Frontend

- No build tools — edit HTML/CSS/JS directly in `public/`
- Client-side form submission uses `fetch` with JSON body (not traditional form POST)
- Success/error messages shown via a toggled `.message` div with CSS class switching

### Testing the server manually

There is no test framework. To verify changes manually:

```bash
DB_PATH=/tmp/test.db AUTH_USER=admin AUTH_PASS=secret node server.js
# In another terminal:
curl -s -X POST http://localhost:3000/submit-feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@t.com","rating":"5","comments":"Hi","recommend":"yes"}'
curl -s -u admin:secret http://localhost:3000/feedback
```

The server does not export `app` for programmatic testing — it must be started as a process.
