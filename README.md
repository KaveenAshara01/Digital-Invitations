# Digital Invitations

A phased digital invitation SaaS built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Better Auth.

Phases 1–2 implement real authentication, a private dashboard, eight original reusable templates, invitation creation, a shared live editor, saved drafts, duplication/deletion, and owner-scoped access. Media, publishing/autosave, and RSVP follow in subsequent phases.

See [setup instructions](docs/setup.md), the [Phase 2 workflow](docs/phase2.md), and the [phase roadmap](docs/roadmap.md).

```sh
npm ci
# Create .env from .env.example and configure PostgreSQL and authentication.
npm run db:deploy
npm run db:seed
npm run dev
```
