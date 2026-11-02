# Implementation phases

1. **Foundation** — Next.js, strict TypeScript, Tailwind, Prisma/PostgreSQL, authentication, ownership checks, security integration tests.
2. **Templates and invitations** — eight reusable designs, registry, gallery, creation, configuration persistence, live editor.
3. **Media** — real R2 integration, validated uploads, metadata and references, video posters and lazy loading.
4. **Publishing** — race-safe autosave, immutable publication snapshots, public URLs, republishing tests.
5. **Guests and RSVP** — private guest management, secure links, rate-limited responses and reporting.
6. **Testing and deployment** — full acceptance workflow, accessibility and performance checks, infrastructure and media documentation.

Critical security tests are added with each feature, rather than deferred until Phase 6. Template, publication, guest, and media tables evolve through tracked migrations.

## Current progress

Phases 1–5 are implemented. Guest management includes private revocable links, rate-limited RSVP updates, party-size limits, response totals and CSV export. Publishing simulates successful payment and records a separate simulation timestamp; real payment integration is deferred. See [guests](guests.md), [publishing](publishing.md), and [storage setup](storage.md).

Phase 6 includes automated acceptance coverage, production build validation and a [deployment runbook](deployment.md). Final deployed browser/device, accessibility and performance measurements remain release checks; they are not claimed as completed by unit or database tests.
