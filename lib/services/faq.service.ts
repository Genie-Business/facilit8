import { prisma } from "@/lib/db";

export async function listOrderedFaqs() {
  return prisma.fAQ.findMany({ orderBy: { order: "asc" } });
}

export async function listAllFaqs() {
  return listOrderedFaqs();
}

export async function createFaq(question: string, answer: string) {
  const { _max } = await prisma.fAQ.aggregate({ _max: { order: true } });
  return prisma.fAQ.create({
    data: { question: question.trim(), answer: answer.trim(), order: (_max.order ?? -1) + 1 },
  });
}

export async function deleteFaq(id: string) {
  return prisma.fAQ.delete({ where: { id } });
}
