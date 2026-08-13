import { prisma } from "@/lib/db";

export interface EducationHistoryInput {
  institution: string;
  qualification: string;
  fieldOfStudy?: string | null;
  startDate: Date;
  endDate?: Date | null;
  grade?: string | null;
  relevantCoursework?: string | null;
}

export async function listEducationHistory(userId: string) {
  return prisma.educationHistory.findMany({ where: { userId }, orderBy: { startDate: "desc" } });
}

export async function createEducationHistory(userId: string, input: EducationHistoryInput) {
  return prisma.educationHistory.create({ data: { userId, ...input } });
}

export async function updateEducationHistory(id: string, userId: string, input: EducationHistoryInput) {
  const existing = await prisma.educationHistory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Not authorized to edit this record.");
  return prisma.educationHistory.update({ where: { id }, data: input });
}

export async function deleteEducationHistory(id: string, userId: string) {
  const existing = await prisma.educationHistory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Not authorized to delete this record.");
  return prisma.educationHistory.delete({ where: { id } });
}
