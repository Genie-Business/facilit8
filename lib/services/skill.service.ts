import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";

export async function listActiveSkills() {
  return prisma.skill.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function listAllSkills() {
  return prisma.skill.findMany({ orderBy: { name: "asc" } });
}

export async function createSkill(name: string) {
  const trimmed = name.trim();
  const slug = await generateUniqueSlug(
    trimmed,
    async (candidate) => (await prisma.skill.findUnique({ where: { slug: candidate } })) !== null
  );
  return prisma.skill.create({ data: { name: trimmed, slug } });
}

export async function setSkillActive(id: string, isActive: boolean) {
  return prisma.skill.update({ where: { id }, data: { isActive } });
}

export async function deleteSkill(id: string) {
  return prisma.skill.delete({ where: { id } });
}

export async function setFacilitatorSkills(userId: string, skillIds: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.facilitatorSkill.deleteMany({ where: { userId } }),
    ...(skillIds.length > 0
      ? [
          prisma.facilitatorSkill.createMany({
            data: skillIds.map((skillId) => ({ userId, skillId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}
