# Implementation phases

1. **Foundation** — Next.js, strict TypeScript, Tailwind, Prisma/PostgreSQL, authentication, ownership checks, security integration tests.
2. **Templates and invitations** — eight reusable designs, registry, gallery, creation, configuration persistence, live editor.
3. **Media** — real R2 integration, validated uploads, metadata and references, video posters and lazy loading.
4. **Publishing** — race-safe autosave, immutable publication snapshots, public URLs, republishing tests.
5. **Guests and RSVP** — private guest management, secure links, rate-limited responses and reporting.
6. **Testing and deployment** — full acceptance workflow, accessibility and performance checks, infrastructure and media documentation.

Each phase is reviewed separately. Critical security tests are added with the feature, rather than deferred until Phase 6. Phase 1 includes only the initial invitation ownership model; template, publication, guest, and media tables evolve through later tracked migrations.
