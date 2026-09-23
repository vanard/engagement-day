# Project rules

## Purpose and scope

Build a personal engagement (lamaran) invitation inspired by the garden stationery at
https://dribbble.com/shots/21122199-Printable-Garden-Engagement-Invitation-Template.
This project is separate from the sibling wedding project. Keep it simple:
an opening cover, engagement details, optional music, and wishes. No RSVP or
attendance collection. Preserve the user's supplied couple names.
Create an original implementation using the couple's own content and licensed
assets. The reference is inspiration for features and presentation.

Plan for at least 1,000 invited people. This is a guest count, not a promise of
1,000 concurrent visitors. Allow multiple visits per guest. Use 3,000 visits
during the invitation period and 100 simultaneous visitors as initial planning
and verification scenarios; revise these when actual traffic is known.

## Agreed stack

- Astro with TypeScript in strict mode.
- Prebuilt static HTML for invitation pages; small vanilla JavaScript modules
  for interactivity. Add a UI framework only if a concrete requirement warrants it.
- Scoped plain CSS, CSS custom properties, Grid, and Flexbox. Use a mobile-first
  layout. Do not introduce Tailwind or a component library by default.
- CSS transitions and IntersectionObserver for section reveals. Use larger
  animation libraries only for effects that cannot reasonably use this baseline.
- GitHub for source control and Vercel for hosting and automatic deployments.
- Supabase Postgres for private invitation identities and moderated wishes.
- Vercel Functions for backend endpoints, colocated with the website. A separate
  Cloudflare Worker or continuously running server is not part of this design.
- Use npm with a committed lockfile and a supported Node.js LTS version that
  matches the hosting configuration.

Keep Astro output static. Add Vercel Functions separately where practical;
introduce an Astro deployment adapter only if its runtime features are needed.
Do not make every invitation visit invoke a function or query the database.

## Content and features

Keep engagement details, event times, and asset references in a typed content
file so the couple can update them in one place. Never invent final names,
dates, addresses, payment details, or photos; label temporary content clearly.

Expected features are an opening cover, guest greeting, couple and event details,
location link when supplied, optional music, and wishes. Do not add galleries,
countdowns, gifts, or RSVP without a new requirement. Use light paper, pale green
washes, original botanical artwork, restrained serif and script typography.

- Store event timestamps with an explicit timezone; display them in the event's
  configured timezone. Stop the countdown gracefully when the event starts.
- Read `?to=` only as a display greeting and render it as text, never as HTML.
  It is not proof of identity or authorization.
- A personal link authorizing wishes should use an opaque, unguessable guest token. Store its
  hash in the database and validate the token on the server. Do not ship the guest
  list or tokens in static files, source control, public queries, or analytics.
- A private invitation identity can represent one person or a family. Do not
  collect attendance counts in this engagement project.

## Data and API design

Keep database migrations in `supabase/migrations/`. Use appropriate database
constraints and indexes, not only application checks.

- Separate private invitation data from public wishes. Public responses must not
  contain contact details or invitation tokens.
- Use an idempotency key per wish submission and a database uniqueness constraint
  so retried submissions do not create duplicates.
- Validate request types and field lengths on the server. Bound request size and
  return clear, recoverable errors.
- Add server-enforced abuse controls to public submission endpoints. Rate limits
  must work across function instances; an in-memory counter alone is insufficient.
  Avoid relying only on IP limits because guests can share a network.
- Add a server-verified bot challenge if required by the launch abuse review.
  Never rely on client-side validation or CORS as an access control.
- Enable Row Level Security for exposed tables and grant only required access.
  Keep Supabase secret/service-role keys in server-only environment variables;
  these keys bypass RLS, so server endpoints must also enforce authorization.
- Publish only approved wishes. Paginate them, initially 20 per request with a
  hard maximum of 50, and cache public responses where appropriate. Do not load
  the entire guestbook, poll continuously, or enable realtime subscriptions by
  default. Never publicly cache personalized or private responses.
- Show success only after a confirmed save. Preserve entered form data after a
  failure and support safe retries. Prevent accidental repeat clicks.
- Keep secrets out of logs and source control. Commit an `.env.example` with
  placeholders, and ignore actual environment files.

## Performance and capacity

The cover and event information must render without waiting for Supabase, music,
or optional third-party services. Database failure must not prevent
guests from reading the invitation.

Use these as initial performance budgets, measured on production builds:

- Initial compressed JavaScript: aim for at most 50 KB, excluding lazily loaded
  optional features. Avoid shipping a database SDK to the browser when fetch
  calls to the site's endpoints suffice.
- Initial transferred page assets: aim for at most 1 MB, including the cover
  artwork and fonts, excluding deferred music.
- A full visit with optional audio: aim for at most 5 MB.
  At 3,000 uncached visits, that is roughly 15 GB of asset transfer before
  retries, bots, API traffic, and other overhead. This is an estimate, not a
  hosting quota or guarantee.
- Target LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 at the 75th percentile
  when field data becomes available. Before launch, use mobile lab measurements
  and real-device checks; do not present lab scores as field results.

Generate responsive image sizes and modern formats with appropriate fallbacks.
Prioritize the cover image, lazy-load below-the-fold media, reserve image space,
and use a small set of subsetted WOFF2 fonts with sensible fallbacks.
Keep optimized public photos and optional audio with the deployed static assets
initially. Do not place private guest data there. Avoid large original photos,
autoplay video, embedded maps on initial load, and unnecessary third-party scripts.

Do not preload the full soundtrack. Start playback from the opening-button user
gesture, handle playback rejection, and provide an accessible play/pause control.

## Responsive behavior and accessibility

- Support layouts from 320 px phones to wide desktop screens without horizontal
  overflow. Use a single column on small screens and an intentional wider layout
  on desktop. Check portrait and landscape orientations.
- Use semantic HTML, labeled form fields, visible focus, keyboard navigation,
  meaningful image alternatives, readable contrast, and roughly 44 px touch targets.
- Respect `prefers-reduced-motion`. Content must remain visible when reveal
  scripts fail or are unsupported. Essential invitation information must remain
  readable without JavaScript.
- Use broadly supported browser features and provide fallbacks for enhancements.
  Set the JavaScript build target deliberately; transpilation does not polyfill
  missing browser APIs. Record the minimum tested browser versions before launch.
- Account for mobile browser toolbars and display safe areas. Do not disable zoom,
  require hover, or hijack native scrolling.
- Check iOS Safari, Android Chrome, Samsung Internet, desktop Chrome/Edge,
  Firefox, and Safari. Include links opened from WhatsApp and Instagram where
  available. Browser emulation supplements actual phone checks.

## Verification

For implementation changes, run the relevant type checks and production build.
Add focused tests for token authorization, wish validation, duplicate retries,
and private/public data separation. Avoid tests that merely
repeat styling or implementation details.

Before launch:

- Exercise opening the invitation, music controls, wishes, pagination, and
  offline/error behavior. Verify that no attendance form is present.
- Check at least one lower-powered Android device and an iPhone, with slow-network
  testing and a desktop keyboard pass. Report unavailable checks honestly.
- Use synthetic data in a local or designated test environment to exercise
  1,000 guest records and a bounded 100-concurrent-visitor scenario. Test read
  traffic and submissions separately, including database errors and retries.
  Do not load-test production or shared free services without checking their
  policies and obtaining authorization for that target.
- Verify deployed function routing, environment variables, database policies,
  static caching, and the deployed site's behavior; a local build is insufficient.
- Document measured results, unresolved limitations, and any budget exceptions.

## Hosting and operations

Start with free hosting/database plans and the hosting provider's free subdomain.
A custom domain is optional and usually has a separate registration cost.
Do not activate paid plans or billing features without explicit authorization.

Verify current provider limits and terms before deployment; free plans are not
unlimited and can change. Vercel Hobby is intended for personal, non-commercial
use. Reassess hosting if this becomes a paid invitation service.

Supabase Free currently has an inactivity-pause policy. Verify the current policy,
check database readiness before invitations are sent and before the event, and
document how to restore service. Do not use artificial traffic to evade limits.

Keep preview/test submissions separate from production guest data. Provide a
simple documented process for the owner to approve and export wishes.
Store exports privately and keep a recoverable backup
before the event; do not assume free-plan backups are available.

## Working conventions

Keep changes focused and explain significant architectural decisions. Prefer the
agreed stack and minimal dependencies. Maintain setup, environment-variable,
migration, deployment, and owner-operation instructions as features are added.
Do not commit or push changes unless requested. Never claim a deployment,
device check, load test, or security check succeeded unless it was performed.
