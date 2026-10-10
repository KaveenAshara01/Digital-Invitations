# Phase 1 setup

Use Node.js 22.12 or newer (22 LTS recommended), npm, and PostgreSQL. A project-local Node 22 development dependency is included for machines with an older system Node; npm scripts use it automatically after installation.

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `BETTER_AUTH_SECRET` in `.env`. Keep `.env` private. `BETTER_AUTH_URL` must match the browser origin exactly; use HTTPS in production. Missing configuration fails with an actionable server error. Public landing and authentication form pages can render before configuration, but authentication needs PostgreSQL.

## PostgreSQL / Neon

Create a Neon project and database, then copy its PostgreSQL connection string into `DATABASE_URL`. Preserve the SSL parameters Neon supplies. Use a direct connection when running migrations if your chosen pooling configuration requires it. Alternatively, point at an existing local PostgreSQL database.

```powershell
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Visit http://localhost:3000, register with a password of at least 12 characters, and open the dashboard. Update your name in Account settings, sign out, and sign back in. No users or invitations are seeded. Templates and the live editor are available; see [Phase 2](phase2.md) for the complete workflow.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

Tests start a disposable real PostgreSQL instance using `embedded-postgres`, apply tracked migrations, and exercise Better Auth and the private invitation API. No Neon credentials or Docker are required. PostgreSQL binaries are development dependencies. Tests allocate a local port and remove their temporary database after shutting down; they never use your configured database.

Use `npm run db:migrate -- --name descriptive_change` for schema development against a development database. Commit generated migrations. Use `npm run db:deploy` in production; never use `db push` to evolve production schemas.

## Security and boundaries

Better Auth hashes credentials and stores sessions in PostgreSQL. Session checks run on protected pages and API handlers; UI visibility is not authorization. Cookie caching is disabled so revoked sessions are checked against the database. Auth POST routes additionally require an exact matching Origin and JSON content type, alongside library safeguards. Server hooks validate account names. Login and registration are limited to five attempts per minute per IP using database storage.

`deepmerge-ts` is overridden to its patched v8 release for Prisma's CLI configuration dependency; schema generation, migration execution, and the build are checked with this override. Reassess this override when upgrading Prisma.

Configure your eventual hosting proxy to overwrite client-supplied forwarding headers with the actual client IP; rate limiting depends on trustworthy proxy headers. Use HTTPS so session cookies are secure. Password reset and email verification delivery need an email provider and are not part of Phase 1; registration currently accepts an unverified email address. Do not represent email addresses as verified identities.

The user is the tenant in this initial model. Every private invitation read scopes the SQL query by the authenticated owner's ID. Another owner's ID returns the same 404 as a missing record. Future guests and media must inherit this rule, with isolation tests when introduced.

## Troubleshooting

- Connection refused / Prisma P1001: confirm PostgreSQL is running and the connection string is correct.
- Missing tables: run `npm run db:deploy` against the configured database.
- Invalid origin: match `BETTER_AUTH_URL` to the exact browser URL and restart the server.
- Unsupported engine: install Node 22.12+ or use the included project-local runtime after `npm ci`.
- Embedded PostgreSQL cannot start: check security software, local port permissions, and whether optional npm dependencies/install scripts were disabled.

### Neon connections on networks with broken IPv6

The application uses Prisma's PostgreSQL driver adapter (`@prisma/adapter-pg`) with the Node PostgreSQL driver. This replaces the native Prisma query engine, which timed out on this development network even though Node PostgreSQL connected with the same credentials. The application retains the Neon hostname; do not hardcode a resolved IP address. TLS `sslmode=require` is upgraded to `verify-full` in the application to preserve certificate and hostname verification. The pool allows five connections with a 30-second connection timeout.

After changing dependencies or database configuration, stop the development server, run `npm run db:generate`, and restart `npm run dev`. Prisma migration commands still use the CLI's schema engine; application driver changes do not change migration networking. If migrations alone fail, use a working network or resolve the machine's IPv6 connectivity.

R2 placeholders are reserved for Phase 3. This phase neither accesses R2 nor exposes credentials to the browser. Hosting, infrastructure pricing, and deployment documentation are completed in Phase 6.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next), [Better Auth rate limits](https://better-auth.com/docs/concepts/rate-limit), [Prisma migrations](https://www.prisma.io/docs/orm/prisma-migrate).
