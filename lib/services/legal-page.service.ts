import { prisma } from "@/lib/db";

export async function getLegalPage(slug: "privacy" | "terms") {
  return prisma.legalPage.findUnique({ where: { slug } });
}

export async function upsertLegalPage(slug: string, title: string, contentHtml: string) {
  return prisma.legalPage.upsert({
    where: { slug },
    create: { slug, title: title.trim(), contentHtml: contentHtml.trim() },
    update: { title: title.trim(), contentHtml: contentHtml.trim() },
  });
}
