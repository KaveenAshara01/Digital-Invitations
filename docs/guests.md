# Guests, RSVP and simulated payment

Apply migration `202611010005_guests` and regenerate Prisma before starting the updated server. Existing drafts, accounts and publications are preserved.

The editor's Guests panel creates named parties of 1–20 people with optional email addresses. Each party receives an unguessable UUID link at `/rsvp/<token>`. Share links manually; the app does not send email. Guests need no account. Links expose that party's name and response alongside the published invitation. Treat them as private credentials. Replace a link to revoke the old one, or delete a guest to revoke access and remove their response. General public invitation links never expose the guest list.

RSVP works only while the invitation is published and its published configuration enables RSVP and shows the RSVP section. Draft edits take effect after republishing. Guests may accept with a headcount up to their party size, decline, and update their message or dietary requirements. Responses are limited to five successful updates per party per minute using database locks and counters, including across server instances. Origin checks and a 32 KB request limit apply. A hosting-level request limiter is still recommended against high-volume invalid-token traffic.

The owner sees pending, accepted and declined parties and total attending. CSV exports include names, emails, party sizes, responses, headcounts and notes, excluding link tokens. Formula-like spreadsheet cells are escaped. Unpublishing disables responses; publishing again restores existing guest links and responses. Deleting the invitation cascades to guests.

Payment is temporarily simulated as successful when publishing. The server records `Invitation.simulatedPaymentAt` once; repeat publishing does not create another payment record. This field is explicitly a simulation, never proof of a real charge. No payment provider, checkout, card collection, receipt or money transfer exists. The Publish panel displays this state. Before accepting real payments, replace this behavior with provider checkout, verified signed webhooks, idempotent payment records and server-side entitlement checks.
