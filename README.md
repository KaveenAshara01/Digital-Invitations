# Digital Invitations

A phased digital invitation SaaS built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Better Auth.

Phase 1 implements real email/password authentication, a protected dashboard, account name settings, and owner-scoped private invitation access. Invitations, templates, media, publication, and RSVP follow in subsequent phases.

See [setup instructions](docs/setup.md) and the [phase roadmap](docs/roadmap.md).

```sh
npm ci
# Create .env from .env.example and configure PostgreSQL and authentication.
npm run db:deploy
npm run dev
```
