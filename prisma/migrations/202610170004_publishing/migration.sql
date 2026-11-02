ALTER TABLE "Invitation" ADD COLUMN "publicSlug" TEXT, ADD COLUMN "publicationId" TEXT;
CREATE UNIQUE INDEX "Invitation_publicSlug_key" ON "Invitation"("publicSlug");
CREATE UNIQUE INDEX "Invitation_publicationId_key" ON "Invitation"("publicationId");
CREATE TABLE "Publication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invitationId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "configuration" JSONB NOT NULL,
  "revision" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Publication_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Publication_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Publication_invitationId_createdAt_idx" ON "Publication"("invitationId", "createdAt");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "PublicationMedia" (
  "publicationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  CONSTRAINT "PublicationMedia_pkey" PRIMARY KEY ("publicationId", "assetId"),
  CONSTRAINT "PublicationMedia_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublicationMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
