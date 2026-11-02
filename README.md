# Digital Invitations

A phased digital invitation SaaS built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Better Auth.

Phases 1–5 implement authentication, a private dashboard, nine animated templates, a live editor with autosave, private media uploads, optional music, immutable public invitation snapshots, duplication/deletion, owner-scoped access, guest management, private RSVP links and CSV reports. Publishing currently simulates successful payment; no money is charged.

See [setup instructions](docs/setup.md), the [Phase 2 workflow](docs/phase2.md), and the [phase roadmap](docs/roadmap.md).

```sh
npm ci
# Create .env from .env.example and configure PostgreSQL and authentication.
npm run db:deploy
npm run db:seed
npm run dev
```

## Private media (Phase 3)

Photos, MP4 video and MP3 music can be uploaded from the editor Media panel. Configure the private R2 bucket using [docs/storage.md](docs/storage.md). Apply migrations and regenerate Prisma before restarting the server. Run `npm run media:cleanup` daily after configuring R2. See [publishing](docs/publishing.md) for autosave and shareable invitation links.


Open Publish in the editor to create or update a shareable invitation link, then use Guests to manage private RSVP links and responses. See [publishing](docs/publishing.md), [guests and payment simulation](docs/guests.md), and [deployment acceptance](docs/deployment.md). Phase 6 automated checks and deployment instructions are included; deployed browser/device acceptance remains a release check.
