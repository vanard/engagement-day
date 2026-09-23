# Lamaran

Personal engagement invitation based on the couple’s supplied video: burgundy
envelope, ivory ribbon stationery, illustrated portraits, and a sage closing card.
Built with scoped CSS, TypeScript, and a Supabase wishes foundation. This project is
independent of the wedding copy. RSVP and attendance collection are not included.
The supplied full names are retained. The video supplies Saturday, 10 October 2026,
16:00–finish, at Roemah Langko. Timezone and the exact address/map link still need
confirmation; `startsAt` remains null until the timezone is confirmed.

## Run locally

Use Node 22.12+ (22.x), then:

```sh
npm ci
npm run dev
```

Visit `http://localhost:4321/?to=Somebody`. `Buka Undangan` reveals the main page,
moves keyboard focus, and requests music playback from that same click. The
cover and main content share a document so audio survives section navigation.
Without JavaScript the main content is readable below the cover.

```sh
npm run check
npm run build
npm run preview
```

Browser regression checks: `npx playwright test` (after `npm run build`). Install
the required browsers with `npx playwright install chromium webkit` if needed.
These checks cover Chromium at phone width, desktop WebKit, reduced motion,
no-JavaScript access, greeting escaping and rejected audio playback. They do not
replace real iPhone/Android or real-song playback checks.

## Structure

- `src/content/invitation.ts`: typed names, event details and optional audio.
- `src/layouts/`: document metadata and global style entry point.
- `src/components/`: ribbon frames, original table illustration, opening cover, music controls and wishes.
- `src/styles/`: shared tokens and accessible base styles; component CSS is scoped.
- `src/scripts/`: opening state, music lifecycle and one-shot scroll reveals.
- `src/lib/contracts.ts`: planned request/response types.
- `api/`: Vercel Function placeholders that return 503, never fake success.
- `supabase/migrations/`: private invitation identities, moderated wishes, uniqueness and RLS.

## Content and audio

Edit the typed content file. Set `isPreview` to false only after replacing the
temporary content. Place a licensed MP3 in `public/audio/` and set `music.src`.
No audio file is supplied; the player clearly indicates this until configured.
The portrait WebP crops come from the user-supplied engagement video (4s and 14s).
The envelope, lace border, ribbon frames, and table illustration are original CSS/SVG.
Video audio is not bundled. Higher-resolution original portraits can replace the
video crops using the asset paths in the content file. Cormorant Garamond
and Great Vibes are locally hosted through Fontsource (OFL-licensed font packages).
There are no runtime Google Fonts requests. The visual direction follows the supplied engagement video. Music pauses when the tab is hidden and requires
a tap to resume. Set `event.mapUrl` when a real venue link is available.

## Wishes: prepared, not connected

The wishes form is intentionally disabled and its endpoint returns `NOT_READY`. No guest data
is stored yet. Astro dev/preview serve the static site, not the root `api/`
functions; use Vercel's local runtime or a preview deployment when integrating APIs.

Before enabling forms:

1. Create a separate Supabase test project and apply the SQL migration there.
2. Set server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the runtime environment.
3. Implement token hashing/lookup, request validation and persistent rate limiting.
   Authorize the invitation token on the server; never trust `?to=`.
4. Implement wish idempotency and approved-wish cursor
   pagination (20 by default, at most 50). Keep private responses uncached.
5. Wire the forms through same-origin fetch requests, with pending/error/success
   states, safe retries and preserved input on failure. Add authorization and
   persistence tests against the test database before enabling submission.
6. Add the owner's moderation/export workflow and verify backups and free-plan readiness.

The initial, unapplied schema has been simplified to wishes only. If you already
applied an older wedding schema elsewhere, do not re-run this baseline over it;
use a separate engagement database or an explicit migration plan.
The migration is not applied automatically. Tables are inaccessible to anonymous
and authenticated browser roles. Server credentials bypass RLS and therefore require
explicit authorization in every endpoint. No database integration or load test has
been completed in this foundation.

## Deployment

Import the GitHub repository into Vercel, select Astro and Node 22.x. Build with
`npm run build`, output `dist`. Root `api/` functions deploy separately from the
static pages. No Astro server adapter is needed. Set secrets only in Vercel, never
in `PUBLIC_` variables. Keep preview and production databases separate.

No Git repository, remote, deployment, or paid service is created by this scaffold.
Use the launch checklist and budgets in `AGENTS.md` before distributing links.
Physical phone testing and the 1,000-guest/100-concurrent scenario remain launch checks.

## Video adaptation verification (23 September 2026)

- `npm run check`: zero errors or warnings; static production build passed.
- All 8 existing Playwright checks passed in mobile Chromium and desktop WebKit,
  including no-JavaScript reading at 320px, safe greetings and music rejection.
- Reviewed the generated cover and desktop invitation screenshots.
- Build artifact estimate: about 170 KB for all static files (gzip for text;
  includes about 1 KB of compressed inline JavaScript). This is not a measured
  network waterfall or a Core Web Vitals result.
- Portraits are video-resolution crops; the closing portrait loads lazily.
- Real devices, landscape orientations, load tests and deployment remain unverified.
  Wishes and audio remain unconnected; timezone and venue map need confirmation.
