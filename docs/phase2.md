# Phase 2: templates and private invitations

## Local setup / upgrades

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Restart an existing dev server after migrations and client generation. The seed is idempotent and does not create users or invitations. Never run reset commands against your Neon database. The migration only adds tables and fields and preserves existing accounts and invitations.

The Phase 2 migration and template seed were applied to the configured Neon database during implementation. Prisma's native migration engine needed a temporary IPv4 connection on this development network; the application and saved `.env` retain the Neon hostname and use the PostgreSQL driver adapter.

## Try the workflow

1. Open `/templates`, filter by event category, and preview any of the eight designs.
2. Choose **Make this invitation**. Sign in if needed; the app returns you to your selected design. Create a private draft.
3. Change names, story, event date and time zone, venue, map link, colours, typography, and section visibility/order. The central preview updates immediately.
4. Click **Save draft**, return to the dashboard, and reopen the invitation. Saved configuration persists in PostgreSQL.
5. Duplicate a draft, or delete one using the inline confirmation. Copies get their own ID and always start as private drafts.
6. Open the same draft in two tabs. Save one, then try saving the other. A revision conflict blocks stale edits. **Load saved version** replaces unsaved edits only after confirmation.

This phase uses explicit saving. Autosave and publishing are Phase 4. Drafts do not have public invitation URLs. Photo/video/audio uploads arrive in Phase 3; guest responses arrive in Phase 5. The cinematic design includes original CSS doors, a skip/replay control, and reduced-motion support. It does not claim to include a finished video asset. Gallery/cover placeholders reserve the layout for customer media.

All eight designs now include original animation: botanical swaying, drifting petals, golden lights, moving confetti, ring reveals, editorial text entrances, and gentle image motion. Use **Animate preview** in the gallery to load one live design at a time. The invitation and editor expose pause/replay controls. Decorative motion stops offscreen and honours the device's reduced-motion preference. Animation controls do not change or reset invitation content, and existing saved drafts gain the shared animation layer without a schema migration.

## Template architecture

`src/lib/templates/registry.ts` defines the catalogue, default themes/content, supported sections, and configuration versions. Each of the eight designs has its own React hero component and styling in `src/components/templates/invitation-renderer.tsx`, using a common section renderer and editor. The gallery uses lightweight original SVG posters, not videos. These posters are previews only; invitations render real HTML/React text.

`Template` stores searchable metadata. `TemplateVersion` stores the reusable JSONB definition; seeds never overwrite an existing version. New invitations copy their defaults from the stored version and pin its ID. When changing a shipped template's layout/defaults, increment its version and retain a renderer for older versions. Do not silently change a version. Legacy Phase 1 drafts without a template remain preserved and have a helpful editor message.

Posters and vector illustrations are original repository assets. Run `npm run assets:posters` to regenerate the eight posters. No third-party photos, remote fonts, commercial music, or paid services are used.

## Configuration and API

Configuration version 1 includes host names, event title, description, greeting, wall-clock event date, IANA time zone, venue/address, HTTPS map link, dress code, extra information, theme colours/font/heading scale, countdown and opening settings, section order/visibility, and RSVP display settings. Rich HTML is not accepted; React escapes user text. Only validated hex colours and curated font IDs reach theme styles. Countdown converts the selected local time to its event zone independently of the guest's browser zone.

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/invitations?page=1` | Owner-scoped pages of 12 drafts; returns items/total/page/pages |
| `POST /api/invitations` | Creates a draft from `{ templateSlug, title }` |
| `GET /api/invitations/:id` | Reads the authenticated owner's draft |
| `PATCH /api/invitations/:id` | Saves `{ title, configuration, revision }`; returns incremented revision |
| `POST /api/invitations/:id/duplicate` | Copies the owner's configuration into a new private draft |
| `DELETE /api/invitations/:id` | Deletes an owned invitation; returns 204 |

Mutations validate the session and exact request Origin. JSON create/update bodies are limited to 32 KB and validated with strict Zod schemas. Browser-supplied owner IDs are rejected. Missing and other-owner invitations return the same 404. Revision compare-and-increment happens atomically in SQL, so only one concurrent save can win. The editor snapshots the submitted form and keeps edits made while saving marked unsaved. Database errors do not expose connection strings or ORM details through these APIs.

## Verification

`npm test` exercises registration/sessions, seeded templates, full invitation create/edit/read/duplicate/delete flow, pagination, tenant isolation, concurrent saves, input and origin validation, template defaults, time zones, live editor field changes, styles/section ordering, saving/retry/conflict handling, cinematic reveal, and gallery filtering. Backend tests use disposable real PostgreSQL; UI tests use jsdom. These checks do not replace real-device/browser acceptance testing planned for Phase 6.
