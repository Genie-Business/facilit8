import { prisma } from "@/lib/db";
import type { EmploymentType } from "@/lib/generated/prisma/client";

export interface EmploymentHistoryInput {
  companyName: string;
  jobTitle: string;
  industry?: string | null;
  employmentType: EmploymentType;
  location?: string | null;
  startDate: Date;
  endDate?: Date | null;
  isCurrent: boolean;
  responsibilities?: string | null;
  achievements?: string | null;
  skillsDeveloped?: string[];
  majorProjects?: string | null;
  teamSize?: number | null;
  reasonForLeaving?: string | null;
}

export async function listEmploymentHistory(userId: string) {
  return prisma.employmentHistory.findMany({ where: { userId }, orderBy: { startDate: "desc" } });
}

export async function createEmploymentHistory(userId: string, input: EmploymentHistoryInput) {
  return prisma.employmentHistory.create({ data: { userId, ...input } });
}

export async function updateEmploymentHistory(id: string, userId: string, input: EmploymentHistoryInput) {
  const existing = await prisma.employmentHistory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Not authorized to edit this record.");
  return prisma.employmentHistory.update({ where: { id }, data: input });
}

export async function deleteEmploymentHistory(id: string, userId: string) {
  const existing = await prisma.employmentHistory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Not authorized to delete this record.");
  return prisma.employmentHistory.delete({ where: { id } });
}
