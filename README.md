# MFU Kok Water Watch

Initial local development stack for Vite, React, TypeScript, Supabase, Leaflet, MapTiler Satellite, Esri World Imagery, and Google Earth Engine.

## Local development

Local browser configuration defaults to Supabase at `localhost` or `127.0.0.1`. To use the linked cloud project, explicitly set `VITE_ALLOW_HOSTED_SUPABASE=true` in `.env.local`, along with `VITE_SUPABASE_URL` and a publishable key in `VITE_SUPABASE_ANON_KEY`. This workspace is configured not to use Docker; a local Supabase-compatible service must be started separately before database-backed local testing. Without it, the map displays an unavailable state and survey writes fail closed.

Run `npm run dev` for the Vite UI and local API routes. `npm run preview` also serves these routes for local browser checks. Server-only variables are loaded from local env files without exposing them in the browser bundle. Vercel serves the same handlers from `api/` after deployment. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` for checks.

Turnstile is retained but disabled by default (`VITE_TURNSTILE_ENABLED=false`). Surveys still require server validation, consent, rate limiting, signed upload tickets, the server-only Supabase key, signing secret, and database migrations. To enable Turnstile later, set `VITE_TURNSTILE_ENABLED=true` and configure `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ALLOWED_HOSTNAMES`, then restart or rebuild.

Optionally add `VITE_MAPTILER_API_KEY` to `.env.local`. This is a public browser key; restrict allowed referrers/domains in MapTiler. Without it, the app uses Esri World Imagery, not Google Maps. `GOOGLE_APPLICATION_CREDENTIALS` stays server-only.

The base map uses Leaflet. When `VITE_MAPTILER_API_KEY` is configured, imagery comes from MapTiler's `satellite-v4` tiles and includes MapTiler's logo and attribution. Without that key, the app uses Esri World Imagery tiles, so the map still renders; required Esri/data attribution stays visible bottom-left. Do not hide these credits.

The Earth Engine status endpoint is a Vercel Function at `/api/earth-engine/status`. For Vercel environments, store the service-account JSON in the sensitive `GOOGLE_APPLICATION_CREDENTIALS_JSON` variable.

## Database access

Local development accepts a hosted HTTPS Supabase target only with `VITE_ALLOW_HOSTED_SUPABASE=true`. CLI linking does not apply migrations or configure the survey API server.

`map_configs` uses row-level security. Anonymous clients can read published rows only; client-side insert, update, and delete are revoked.

The survey flow supports optional Cloudflare Turnstile verification at the server and requires a per-IP limit of five accepted submissions per hour, short-lived signed upload URLs, and a server-only Supabase service-role key. The browser cannot insert or read survey rows directly. Public waypoint responses contain only the sample code, arsenic result, coordinates, GPS accuracy, and collection time for submissions with recorded consent. Names, phone numbers, and private image paths are not returned. Images stay in the private `survey-photos` bucket (JPG/PNG/WebP, up to 10 MiB each).

Survey submissions generate atomic `KOK-YYYYMMDD-NNNN` sample codes in Bangkok time, preserve GPS accuracy when available, and appear as waypoint markers. Samples within 250 m are clustered; map popups show sample code, arsenic value, time, count, average, and range only. Public release of exact coordinates and results requires the submitter's explicit consent.

### Vercel production configuration

Set browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_TURNSTILE_SITE_KEY`. Set server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, and a random `SURVEY_SIGNING_SECRET` of at least 32 bytes. Never prefix server secrets with `VITE_`. Apply and verify the security migration only after reviewing the exact production database target and receiving approval for that database operation. Configure Turnstile hostname restrictions for the intended domains. Production deployment is a separate, explicitly approved action.

## Preview checks

Set `PLAYWRIGHT_TEST_BASE_URL` to a Vercel Preview URL and run `npm run test:e2e` for the browser smoke test.
