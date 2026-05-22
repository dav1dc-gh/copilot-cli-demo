# Copilot Instructions

## Commands

- **Start server:** `npm start` (runs `node server.js`, default port 3000)
- **No test suite exists.** Tests are not configured yet.

## Architecture

Single-file Express 5 server (`server.js`) serving a vanilla HTML/CSS/JS frontend from `public/`. No build step, no bundler, no framework on the frontend.

- **Backend:** `server.js` — routes, middleware, and validation; `db.js` — SQLite database layer
- **Frontend:** `public/index.html`, `public/script.js`, `public/styles.css` — plain DOM manipulation, no frameworks
- **Database:** SQLite via `better-sqlite3`, file stored at `DB_PATH` (default: `./feedback.db`)

The app is a feedback form. Users submit feedback via `POST /submit-feedback` (JSON). Admins view submissions via `GET /feedback` (Basic Auth protected). Data persists in SQLite.

### Database (`db.js`)

- Auto-creates the `feedback` table on startup if it doesn't exist
- Uses WAL journal mode for better read performance
- Exports `insertFeedback(data)` and `getAllFeedback()` helpers
- Synchronous API (better-sqlite3) — no async/await needed for DB calls

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

Required env vars for full functionality (not auto-loaded — set them in your shell or hosting platform):

- `PORT` — server port (default: 3000)
- `AUTH_USER` — username for `/feedback` endpoint
- `AUTH_PASS` — password for `/feedback` endpoint
- `DB_PATH` — path to SQLite database file (default: `./feedback.db`)

### Frontend

- No build tools — edit HTML/CSS/JS directly in `public/`
- Client-side form submission uses `fetch` with JSON body (not traditional form POST)
- Success/error messages shown via a toggled `.message` div with CSS class switching
