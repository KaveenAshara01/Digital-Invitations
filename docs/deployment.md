# Deployment and acceptance

Use Node 22.12 or newer, PostgreSQL and private R2 storage. Follow setup.md and storage.md for environment variables, TLS and bucket CORS. Set BETTER_AUTH_URL to the exact HTTPS deployment origin and supply a strong BETTER_AUTH_SECRET through the hosting secret store. Never expose database or R2 credentials to the browser.

Release checks:

1. Run `npm ci`, `npm run typecheck`, `npm test` and `npm run build`.
2. Back up the database. Run `npm run db:deploy` using the deployment environment, then restart the app with the regenerated Prisma client. Apply migrations before serving this version; it requires the guest table and simulation timestamp column.
3. Start with `npm start`. Verify signup/login, account isolation, template selection, draft autosave/recovery, image/video uploads and music in the deployed environment.
4. Publish and confirm the simulation notice. Open the public invitation on a separate browser; edit the draft and confirm public content changes only after republishing.
5. Enable and publish RSVP, add a party, copy its private link and accept/decline/update from a signed-out browser. Check totals and CSV. Replace the link, then unpublish; verify revoked links and submissions fail. Delete the test invitation.
6. Check keyboard navigation, visible focus, field labels, response/error announcements, reduced motion, and layouts at phone/tablet/desktop widths. Verify video and audio behavior on iOS Safari and Android Chrome. Run Lighthouse against the actual public deployment and examine media loading and layout shift.
7. Configure scheduled media cleanup, database backups and restore drills, application error monitoring and hosting-level request limits. Verify private API responses are not cached by the CDN, and guest URLs are omitted from analytics/log exports.

Automated tests exercise the local app and ephemeral PostgreSQL. They do not certify the hosting configuration, real R2 connectivity, physical devices or browser performance. Record those manual results before a production release. Payment remains a simulation until a real provider and verified fulfillment are implemented.
