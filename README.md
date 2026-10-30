# MFU Kok Water Watch

Initial local development stack for Vite, React, TypeScript, MongoDB Atlas (photos in GridFS), Leaflet, MapTiler Satellite, Esri World Imagery, and Google Earth Engine.

## Local development

Survey data and photos live in MongoDB. Two environments, selected automatically:

| Environment | When | Database |
|---|---|---|
| development | any local run (`npm run dev`, tests) | local MongoDB at `mongodb://127.0.0.1:27017`, database `kok_water_watch_dev` (override with `MONGODB_URI_LOCAL`, `MONGODB_DB_LOCAL`) |
| production | on Vercel (`VERCEL=1`) or locally with `APP_ENV=production` | MongoDB Atlas from `MONGODB_URI`, database `kok_water_watch` (override with `MONGODB_DB`) |

Keep the Atlas connection string in `.env.mongodb` or `.env.local` as `MONGODB_URI` and set it in Vercel; a local run never touches it unless you opt in with `APP_ENV=production`. `/api/health` reports which environment is active. Survey photos are stored in the same MongoDB (GridFS bucket `survey_photos`), so there is no separate storage service or token; the browser shrinks large photos and uploads them through `/api/surveys/upload` with a signed 10-minute token. In Atlas, allow the network access Vercel needs (`0.0.0.0/0` unless you use a fixed-IP integration).

Run `npm run dev` for the Vite UI and local API routes. `npm run preview` also serves these routes for local browser checks. Server-only variables are loaded from local env files without exposing them in the browser bundle. Vercel serves the same handlers from `api/` after deployment. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` for checks.

Turnstile is retained but disabled by default (`VITE_TURNSTILE_ENABLED=false`). Surveys still require server validation, consent, rate limiting, signed upload tickets, the server-only database and Blob credentials, and a signing secret. To enable Turnstile later, set `VITE_TURNSTILE_ENABLED=true` and configure `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ALLOWED_HOSTNAMES`, then restart or rebuild.

Optionally add `VITE_MAPTILER_API_KEY` to `.env.local`. This is a public browser key; restrict allowed referrers/domains in MapTiler. Without it, the app uses Esri World Imagery, not Google Maps. `GOOGLE_APPLICATION_CREDENTIALS` stays server-only.

The base map uses Leaflet. When `VITE_MAPTILER_API_KEY` is configured, imagery comes from MapTiler's `satellite-v4` tiles and includes MapTiler's logo and attribution. Without that key, the app uses Esri World Imagery tiles, so the map still renders; required Esri/data attribution stays visible bottom-left. Do not hide these credits.

The Earth Engine status endpoint is a Vercel Function at `/api/earth-engine/status`. For Vercel environments, store the service-account JSON in the sensitive `GOOGLE_APPLICATION_CREDENTIALS_JSON` variable.

## Database access

Collections are created on first use with their indexes (`water_quality_surveys`, `kok_water_samples`, `kok_sample_contacts`, `kok_admin_alerts`, `survey_rate_limits`, `survey_daily_sequences`). All access goes through the server (`api/surveys/_db.js`); the browser never talks to the database.

The survey flow supports optional Cloudflare Turnstile verification at the server and requires a per-IP limit of five accepted submissions per hour, short-lived signed upload tokens limited to one photo path, and server-only credentials. Public waypoint responses contain only the sample code, arsenic result, coordinates, GPS accuracy, and collection time for submissions with recorded consent. Names, phone numbers, and private image paths are not returned. Images are stored privately in MongoDB GridFS (JPG/PNG/WebP, up to 10 MiB each; the browser shrinks anything above 2 MB so uploads stay under Vercel's 4.5 MB request limit) and are served only through the API: the public endpoint for published samples, the admin endpoint with an admin token.

Survey submissions generate atomic `KOK-YYYYMMDD-NNNN` sample codes in Bangkok time, preserve GPS accuracy when available, and appear as waypoint markers. Samples within 250 m are clustered; map popups show sample code, arsenic value, time, count, average, and range only. Public release of exact coordinates and results requires the submitter's explicit consent.

### Vercel production configuration

Set browser-safe `VITE_TURNSTILE_SITE_KEY`. Set server-only `ADMIN_PASSCODE` (there is no default; the admin login stays disabled until it and `SURVEY_SIGNING_SECRET` are set), `MONGODB_URI`, `MONGODB_DB`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, and a random `SURVEY_SIGNING_SECRET` of at least 32 bytes. Never prefix server secrets with `VITE_`. Configure Turnstile hostname restrictions for the intended domains. Production deployment is a separate, explicitly approved action.

## Admin review

On a local development run the admin pages open without a login (set `ADMIN_BYPASS=off` to test the real login); this never applies on Vercel or with `APP_ENV=production`. Otherwise admins unlock the queue with `ADMIN_PASSCODE` and a reviewer name. The session token lasts 12 hours. Every approve/reject stores the decision time, the typed reviewer name and the reason on the sample, and private photos are served only with an admin token. Samples above 50 ppb stay out of the public map until approved.

## Preview checks

Set `PLAYWRIGHT_TEST_BASE_URL` to a Vercel Preview URL and run `npm run test:e2e` for the browser smoke test.
