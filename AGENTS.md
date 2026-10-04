# AGENTS.md

User-owned site code. Keep changes focused on the request and preserve existing conventions.
Start with `README.md` (layout, local run, deploy).

- The backend is Supabase. Pages call it only through `src/api/base44Client.js` (the object is
  still named `base44` from the site's first backend; the name is kept so pages stay untouched).
- `supabase/functions/_shared/entities.js` is shared by the site and the edge functions.
- New tables need row level security policies in a new migration file; never edit an applied one.
- Never commit secrets. `.env.local` is ignored; the `VITE_…` values are public by design.
- Test with `tools/local-stack` (see its README) and run `npx eslint src --quiet && npm run build`.
