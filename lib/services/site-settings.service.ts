import { prisma } from "@/lib/db";

/** Returns the singleton SiteSettings row, creating a sensible default if none exists yet. */
export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return prisma.siteSettings.create({
    data: { id: 1, email: "partners@usefacilit8.training", phone: null, address: "Nigeria" },
  });
}

interface UpdateSiteSettingsInput {
  email: string;
  phone?: string;
  address?: string;
}

export async function updateSiteSettings(input: UpdateSiteSettingsInput) {
  return prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...input },
    update: input,
  });
}
