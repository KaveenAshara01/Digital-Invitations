ALTER TABLE "Invitation" ADD COLUMN "simulatedPaymentAt" TIMESTAMP(3);
CREATE TABLE "Guest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invitationId" TEXT NOT NULL REFERENCES "Invitation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "token" TEXT NOT NULL,
  "partySize" INTEGER NOT NULL DEFAULT 1,
  "response" TEXT NOT NULL DEFAULT 'PENDING',
  "attending" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL DEFAULT '',
  "respondedAt" TIMESTAMP(3),
  "responseWindow" TIMESTAMP(3),
  "responseAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Guest_partySize_check" CHECK ("partySize" BETWEEN 1 AND 20),
  CONSTRAINT "Guest_attending_check" CHECK ("attending" BETWEEN 0 AND "partySize"),
  CONSTRAINT "Guest_response_check" CHECK ("response" IN ('PENDING', 'ACCEPTED', 'DECLINED'))
);
CREATE UNIQUE INDEX "Guest_token_key" ON "Guest"("token");
CREATE INDEX "Guest_invitationId_createdAt_idx" ON "Guest"("invitationId", "createdAt");
