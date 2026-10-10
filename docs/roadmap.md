# Implementation phases

1. **Foundation** — Next.js, strict TypeScript, Tailwind, Prisma/PostgreSQL, authentication, ownership checks, security integration tests.
2. **Templates and invitations** — eight reusable designs, registry, gallery, creation, configuration persistence, live editor.
3. **Media** — real R2 integration, validated uploads, metadata and references, video posters and lazy loading.
4. **Publishing** — race-safe autosave, immutable publication snapshots, public URLs, republishing tests.
5. **Guests and RSVP** — private guest management, secure links, rate-limited responses and reporting.
6. **Testing and deployment** — full acceptance workflow, accessibility and performance checks, infrastructure and media documentation.

Each phase is reviewed separately. Critical security tests are added with the feature, rather than deferred until Phase 6. Phase 1 includes only the initial invitation ownership model; template, publication, guest, and media tables evolve through later tracked migrations.

## Current progress

Phases 1 and 2 are implemented. Phase 2 has 26 passing automated tests, a passing TypeScript check and production build, and a real HTTP acceptance check against Neon for registration, template previews, draft creation, editor rendering, save/reload, duplication/deletion, and account isolation. Temporary acceptance-test records were removed. Browser visual and device testing remain for Phase 6. The next phase is secure R2 media integration.
