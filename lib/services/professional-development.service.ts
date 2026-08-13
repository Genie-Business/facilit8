import { prisma } from "@/lib/db";
import type { ProfessionalDevelopmentType } from "@/lib/generated/prisma/client";

export interface ProfessionalDevelopmentInput {
  type: ProfessionalDevelopmentType;
  title: string;
  provider?: string | null;
  dateCompleted: Date;
  skillsAcquired?: string[];
  expiryDate?: Date | null;
}

export async function listProfessionalDevelopment(userId: string) {
  return prisma.professionalDevelopment.findMany({ where: { userId }, orderBy: { dateCompleted: "desc" } });
}

/** Manual entries only — FACILIT8_AUTO rows are created by the training-completion hook (Stage 2), never by the user directly. */
export async function createProfessionalDevelopment(userId: string, input: ProfessionalDevelopmentInput) {
  return prisma.professionalDevelopment.create({ data: { userId, source: "MANUAL", ...input } });
}

export interface AutoProfessionalDevelopmentInput {
  title: string;
  dateCompleted: Date;
  skillsAcquired?: string[];
  relatedTrainingEventId?: string;
  relatedMergedTrainingEventId?: string;
}

/** Called by the payout services once a delivery is marked isCompleted — never by user input. */
export async function createAutoProfessionalDevelopment(userId: string, input: AutoProfessionalDevelopmentInput) {
  return prisma.professionalDevelopment.create({
    data: { userId, source: "FACILIT8_AUTO", type: "TRAINING", ...input },
  });
}

export async function deleteProfessionalDevelopment(id: string, userId: string) {
  const existing = await prisma.professionalDevelopment.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Not authorized to delete this record.");
  if (existing.source === "FACILIT8_AUTO") throw new Error("Facilit8 training history can't be deleted.");
  return prisma.professionalDevelopment.delete({ where: { id } });
}
