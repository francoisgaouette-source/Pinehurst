# Pinehurst Cup

French golf-trip website adapted from the user-supplied Scotland Cup v2203 archive. Reuses the original Scotland Cup page structure and stylesheet chain: large editorial headings, Voyage / Golf / La Coupe dropdown navigation, player cards, course cards, championship presentation, The Race and modal Golf Passport. The Pinehurst palette is deep green, cream and brick red, inspired by the destination. Original styles are adapted under `src/scotland`; integration and palette overrides are in `src/scotland-integration.css`. The original archive remains in the workspace attachments. The first starter is backed up at `/workspace/pinehurst-setup-backup`, and the previous Pinehurst layout is preserved at `/workspace/pinehurst-before-scotland-layout`.

## Run

Node 20.19+, 22.12+, or 24 and npm are required.

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --port 5173
```

```sh
npm run build
npm run preview -- --port 4173
```

## What works

- French, responsive six-day itinerary (13–18 April 2027), five nights at the Carolina Hotel and ten editable golf rounds. Includes AA 5679 arriving CLT at 10:11 on April 13 and AA 5137 departing CLT at 20:23 on April 18, as supplied by the user.
- Sixteen players: the fifteen names supplied in the recipient list plus Simon St-Denis, confirmed as a player by the user. Six returning Scotland players retain their original portraits and nicknames; ten new players use initials. Email addresses are not stored in application source or displayed. Checkboxes choose players for the local score table. Existing scores and selections for returning players are preserved; archived scores for removed players remain in exported browser data.
- Confirmed Pinehurst Cup rules: individual Cup points 5–4–3–2–1, match play win/tie/loss 1/½/0, foursome awards 2–1–0–0 across four groups. Ties share occupied prizes. Ten-round maximum: 100 Cup points.
- Four cumulative rankings: Pinehurst Cup, individual, Match Play and Foursome. Round-by-round group assignment, 24 pairwise duels for four complete groups, win/tie/loss records, and automatically derived group awards. Missing results stay blank; incomplete standings are labeled provisional.
- Golf passeport for each of 16 players: informational index, manually entered gross/net, shared Stableford, Cup points and position, explicitly completed 18-hole rounds, favorite hole, lost balls, birdies, course rating, best/worst shot, MVP and memories. Open a passport from its player card or the Golf menu; it appears in a dialog and closes with its close button or Escape. Profiles remain separate and are included in JSON exports.
- Manual round Stableford points and total ranking for selected players; ties share a rank. No automatic handicap or hole-by-hole calculation.
- Packing checklist, notes and JSON export. The Daily Chronicle also provides a saved memory field for each of the six days.
- Local-mode persistence under `pinehurst-trip-v1`. Shared mode adds Supabase login and cross-device synchronization. The older local draft is imported only after explicit review; arbitrary JSON-file import is not implemented.

No original Scotland scores, dates, itineraries, PINs, cloud configuration or Supabase connection are imported. Local mode has no login. Shared mode requires an authenticated, invited member, with SQL access policies and no anonymous database access. Group composition and airport transfers still need confirmation. Competition rules were confirmed by the user. Courses and tee times are transcribed from the user-supplied `Horaire golf Pinehurst 2027.pdf`, including No. 11 as printed. The PDF is a guest itinerary, not a list of teams or match opponents. Confirmation numbers are not included in the website. The schedule reflects the user’s supplied plans, not independent booking verification. Existing three-round browser drafts are expanded to ten rounds while preserving their fields, points, selections, notes and checklist. Empty course and tee-time fields are populated from the PDF. User edits are retained and labeled as local adjustments; the source schedule remains visible. The local mode needs no backend. Optional shared mode now uses a separate Supabase project; see docs/SUPABASE-FR.md.

Static assets are bundled by Vite. The supplied archive is a source reference, not a runtime dependency. Trip data and browser state are in `src/main.jsx`. The restored page layout is in `src/ScotlandSite.jsx`; competition and passport UI are in `src/Competition.jsx`, with calculations in `src/competition.js`. Edit palette and integration styles in `src/scotland-integration.css`. Original Scotland cloud, login and legacy scripts are not executed. Pinehurst imagery is explicitly labeled illustration until real destination photos are supplied.

## Competition validation

Run `npm test` for scoring tests (ties, blank versus zero scores, 16-player/24-duel rounds, 100-point maximum, incomplete group protection). `npm run build` validates the production bundle. Browser checks cover the four tables, group/match entry, passport data isolation, persistence, JSON export, keyboard tabs and mobile layout.

New browser sessions include all 16 confirmed players. Existing nonempty selections are kept; an older empty starter is initialized with all 16. Once migrated, deliberately clearing selections remains respected. Existing scores, notes, itinerary, checklist and archived scores are preserved. Passport scores and Stableford entry share the same data. Gross/net scores and index are informational and manually entered, as course/tee handicap data has not been supplied.

## Standalone download

Run `npm run export:html` to produce `dist/Pinehurst-Cup.html`, with JavaScript, styles and portraits embedded. Download and open it in a browser; no server or installation is required. Browser settings may restrict file-based storage; JSON export remains available. The standalone file is a snapshot and must be regenerated after changes. It does not publish the site or synchronize data.

## Shared database (project configured, hosted verification pending)

See docs/SUPABASE-FR.md and supabase/setup.sql. The separate Pinehurst project URL and publishable key are configured in public/cloud-config.json. Installation of the SQL, Auth redirect URLs and email delivery still require hosted verification. Do not reuse Scotland. Never put a service-role/secret key or database password in the frontend. Build-time checks reject privileged keys and the known Scotland project.

Shared data is stored as individually versioned fields. Optimistic writes are transactional, with same-field conflict resolution and per-user/project persisted queues. The browser polls every 2.5 seconds while visible, refreshes on focus/online events, and does not automatically upload earlier local drafts. All invited members can edit the shared trip; per-player ownership restrictions are not implemented.

Tests run PostgreSQL functions in PGlite for SQL/RLS and atomicity, plus sync-engine concurrency/offline tests. Two independent browser contexts have been tested with the real PostgreSQL functions behind an intercepted transport and simulated Auth sessions. This does not verify hosted Supabase authentication, email delivery or production connectivity. Those require the user-created project and final Netlify URL.

For manual Netlify hosting, deploy dist only. public/cloud-config.json is copied to dist/cloud-config.json and contains only public values. Never deploy supabase/setup.sql or the project root: any private invitation list must stay outside the repository. The standalone HTML embeds the public configuration present at generation time and must be regenerated if that configuration changes.

## Deploy on Netlify from GitHub

Link francoisgaouette-source/Pinehurst, branch main, to the existing Pinehurst Netlify project. netlify.toml defines the build command (npm run build), publish directory (dist), Node 24, and uncached public cloud configuration. The Supabase URL and publishable key in public/cloud-config.json are intentionally public browser configuration. Never commit secret/service-role keys, database passwords, or private invitation lists. supabase/setup.sql in GitHub contains schema and policies only; existing memberships are preserved.
