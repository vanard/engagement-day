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
- `src/scripts/`: opening state, music lifecycle, wishes and one-shot scroll reveals.
- `src/lib/contracts.ts`: public request/response types.
- `api/`: Vercel wishes endpoint, backed by `src/server/`.
- `supabase/migrations/`: private invitation identities, moderated wishes, uniqueness and RLS.

## Content and audio

Edit the typed content file. Set `isPreview` to false only after replacing the
temporary content. Place a licensed MP3 in `public/audio/` and set `music.src`.
The configured soundtrack is a 35-second clip (01:29–02:04) from the user-supplied
Glenn Fredly — Kisah Romantis MP3, encoded at 128 kbps (about 561 KB).
The portrait WebP images come from the two user-supplied WhatsApp JPEG illustrations
(23 September 2026), replacing the lower-resolution video crops. Each has two
responsive sizes for sharp rendering on high-density screens; the full artwork is preserved.
The envelope, lace border, ribbon frames, and table illustration are original CSS/SVG.
Video audio is not bundled. Portrait asset paths are configured in the content file. Cormorant Garamond
and Great Vibes are locally hosted through Fontsource (OFL-licensed font packages).
There are no runtime Google Fonts requests. The visual direction follows the supplied engagement video. Music pauses when the tab is hidden and requires
a tap to resume. Set `event.mapUrl` when a real venue link is available.

## Wishes

The section shows the latest three approved wishes once, then refreshes after a
successful submission. Personal invitation links enable submissions; new wishes stay pending
until the owner approves them. The server validates token hashes, limits each
invitation to three new wishes per hour, and deduplicates retries in Postgres.

Follow [the wishes setup and owner guide](docs/wishes.md) to apply both migrations,
configure server-only environment variables, issue private links, approve wishes
and export them. No real guest data or Supabase credentials are included.
Astro dev/preview only serves the static page; use Vercel's runtime to run the API.
Run `npm test` for API and embedded-Postgres checks. PGlite is a development-only
test dependency and is not shipped to the browser or used by production endpoints.
Live Supabase connectivity and deployed function routing remain unverified.

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
