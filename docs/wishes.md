# Wishes setup and owner operations

The page loads the latest **three visible wishes** when the section approaches
the viewport. A successfully saved wish appears immediately for its sender.
There are no older-message or reload buttons and no polling. New wishes are
visible by default; the owner can hide them. There is no attendance collection.

## Connect the backend

1. Create separate Supabase projects for preview/test and production.
2. Apply `supabase/migrations/0001_invitation.sql`, then
   `0002_wish_submission.sql`, then `0003_auto_publish_wishes.sql` to a fresh
   database using the Supabase SQL editor. On an existing database, run only
   migrations not already applied; the new visibility policy needs migration 0003.
3. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server-only Vercel environment
   variables. Use a Supabase secret key or legacy service-role key, never an anon
   key. Set the preview values to the test project and production values to the
   production project. Redeploy to apply environment changes.
4. Vercel deploys `api/wishes.ts` separately from the static Astro site. Astro's
   dev/preview commands do not run this endpoint. Use Vercel's local runtime or a
   designated preview deployment for a real end-to-end integration check.
5. Test a private link, immediate publication, manual hiding, latest-three ordering,
   display after submission, retries, invalid token, and database failure before launch.
   Missing configuration returns a recoverable 503; invitation details still render.

## Create a personal link

Run locally, using an existing private folder **outside this repository**:

```sh
node scripts/create-invitation.mjs https://your-site.vercel.app "Guest name" /private/path/guest.json
```

The command writes a private file with a 256-bit random invitation token in the
link and its SHA-256 hash. It does not connect to Supabase or print the token.
In Supabase's Table Editor, insert **only** `display_name` and `token_hash` into
`invitation_parties`. Share `invitation_url` privately with that guest/family.
The token is in the URL fragment so it isn't sent in page-request access logs;
it is sent in the POST body only. Do not add analytics that collect full URLs,
request bodies or fragments. `?to=` is only a greeting and grants no access.
The current page holds the token in memory. After navigating to an ordinary
section URL and reloading, reopen the original personal link to send a wish.
Revoke a link by replacing its stored hash with a newly generated token hash.
Keep the private link file out of shared folders, screenshots, logs and Git.

## Hide and export

In Supabase's Table Editor, open `wishes`, review the name/message, and set
`approved = false` for any wish you want to hide. Set it back to `true` to show
it again. Do not delete recent submissions: those rows also enforce submission
quotas and preserve retry history. Migration 0003 leaves older hidden or pending
wishes hidden because the old schema cannot distinguish those cases; review them
manually before showing them. The sender sees a new saved wish immediately, while
other visitors may see a cached list for up to about three minutes.

Export wishes from the SQL editor using this query and its CSV download action:

```sql
select name, message, approved, created_at
from public.wishes
order by created_at desc, id desc;
```

Keep exports privately. Before the event, create and verify a private database
backup with the Supabase CLI or Postgres backup tools, including invitation
identities and wish records, and rehearse restoring into a separate test project.
Do not assume the free plan provides recoverable backups.

## Limits and verification

Requests accept at most 8 KB of JSON, 100 characters for names and 1,000 for
messages. Only valid personal tokens can save wishes. A locked invitation row
enforces a shared database quota of three new wishes per hour per invitation,
without penalizing families on the same network. Idempotent retries remain
successful after reaching the limit; reused keys with changed content get 409.
Browser failures keep text and the submission key for retries on the current
page. Reloading closes that retry session, so retry in place after network errors.
All POST responses and errors are `no-store`; only visible public GET responses
are cached. The API default page size is three and its maximum is 50.

`npm test` tests API authorization/validation and runs all migrations against
PGlite (embedded Postgres used only for development tests). It checks visibility,
manual hiding, duplicate retries, quotas, and denied browser-role access.
`npm run build && npx playwright test` checks the UI using synthetic API responses.
These do not verify Vercel routing, real Supabase connectivity, multiple database
connections, or the 100-concurrent-visitor launch scenario. Run those in a
designated test environment before distributing links. Review invalid-token
request abuse and provider firewall controls at launch; add a server-verified bot
challenge if the launch abuse review calls for one. No third-party challenge is
loaded by default.

Local verification on 23 September 2026: type checks and the production build
passed; five server/database tests and eighteen browser checks passed. Database
tests use synthetic data in PGlite; browser tests stub the API. The earlier
static build estimate was about 1.01 MB (gzip for text, including optional music
and both portrait variants); this is not a network measurement or a Core Web
Vitals result. Migration 0003 and the new behavior have not been deployed or
checked on physical devices or under concurrent traffic.

Implementation references: [Vercel Node handlers](https://vercel.com/docs/functions/runtimes/node-js),
[Supabase database function permissions](https://supabase.com/docs/guides/database/functions),
[PGlite testing database](https://pglite.dev/docs/).
