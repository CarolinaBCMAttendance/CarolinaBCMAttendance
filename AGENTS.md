# Carolina BCM Attendance

Attendance check-in app for BCM at the University of South Carolina. A single
Node.js/Express service (`server.js`) exposes a JSON API under `/api/v1/bcm` and
also serves the static frontend (`index.html`, `index.js`, `config.js`,
`index.css`) from the repo root. Data is stored as JSON files in `data/`
(`classes.json`, `people.json`, `attendance.json`); check-ins are appended to
`data/attendance.json`.

Standard commands are documented in `README.md` and `package.json` scripts
(`npm start`, `npm run dev`, `npm test`).

## Cursor Cloud specific instructions

- There is one service. Run it in development mode with `npm run dev` (uses
  `node --watch server.js`); it listens on `http://localhost:3000` and serves
  both the API and the static UI same-origin. `npm start` is the non-watch
  variant.
- There is no lint step and no build step — this is plain JS with no bundler.
  "Build" is a no-op; just run the server.
- Tests: `npm test` (`node --test test/api.test.js`). The suite starts its own
  server on an ephemeral port, so it does not require `npm run dev` to be
  running. It temporarily overwrites `data/attendance.json` and restores it
  afterward.
- Exercising a check-in (via the UI or `POST /api/v1/bcm/check-in`) writes to
  `data/attendance.json`, which is tracked in git. After manual testing, run
  `git checkout data/attendance.json` to discard test records before committing.
- The frontend defaults to same-origin (`config.js` `apiBaseUrl` empty), so no
  extra config is needed when running via `npm run dev`. Only set `CORS_ORIGIN`
  when hosting the frontend and API on separate origins.
