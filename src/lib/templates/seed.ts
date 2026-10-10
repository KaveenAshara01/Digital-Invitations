import type { PrismaClient } from '@prisma/client';
import { templates } from './registry';
export async function seedTemplates(db: PrismaClient) {
  await db.$transaction(templates.map(template => {
    const { defaults, supportedSections, kind, cinematic, version, ...metadata } = template;
    const definition = { defaults, supportedSections: [...supportedSections], kind, cinematic, schemaVersion: 1 };
    // Version definitions are immutable. A design/config change needs a new version.
    return db.template.upsert({
      where: { id: template.id },
      create: { ...metadata, versions: { create: { id: `${template.id}:${version}`, version, definition } } },
      update: { ...metadata, versions: { upsert: { where: { templateId_version: { templateId: template.id, version } }, create: { id: `${template.id}:${version}`, version, definition }, update: {} } } },
    });
  }));
}
