import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/analytics/csv";
import type { DateWindow } from "@/lib/analytics/range";

export const EXPORT_DATASETS = ["users", "events", "applications", "transactions"] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

export const EXPORT_LABELS: Record<ExportDataset, { title: string; description: string }> = {
  users: { title: "Users", description: "Who signed up, their role, location and verification status." },
  events: { title: "Events", description: "Standard training events with budget, status and application counts." },
  applications: { title: "Applications", description: "Every facilitator bid on a standard event." },
  transactions: { title: "Transactions", description: "Funding, payouts, withdrawals, chat and Awé payments." },
};

export function isExportDataset(value: string | null): value is ExportDataset {
  return EXPORT_DATASETS.includes(value as ExportDataset);
}

const PAGE_SIZE = 2000;
export const MAX_EXPORT_ROWS = 200_000;

export class ExportTooLargeError extends Error {
  constructor() {
    super(`More than ${MAX_EXPORT_ROWS.toLocaleString("en-NG")} rows — pick a shorter date range.`);
  }
}

/** Walks a table in id order, a page at a time, so a big export never loads in one query. */
async function collect<T extends { id: string }>(fetchPage: (cursor: string | undefined) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await fetchPage(cursor);
    all.push(...page);
    if (all.length > MAX_EXPORT_ROWS) throw new ExportTooLargeError();
    if (page.length < PAGE_SIZE) return all;
    cursor = page[page.length - 1].id;
  }
}

const pageArgs = (cursor: string | undefined) => ({
  orderBy: { id: "asc" as const },
  take: PAGE_SIZE,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
});

const num = (value: { toString(): string } | null | undefined) => (value == null ? null : Number(value.toString()));

/**
 * CSV of one dataset, limited to records created in the window (`from` null = everything).
 *
 * Deliberately excluded: password hashes, BVN, dates of birth, phone numbers, bank and
 * wallet account details, and Anchor identifiers. Exports are for analysis and outreach by
 * email — anything that could move money or identify someone to a bank stays in the database.
 */
export async function buildExportCsv(dataset: ExportDataset, window: { from: Date | null; to: Date }): Promise<{ csv: string; rows: number }> {
  const created = window.from ? { gte: window.from, lt: window.to } : { lt: window.to };

  switch (dataset) {
    case "users": {
      const users = await collect((cursor) =>
        prisma.user.findMany({
          where: { role: { not: "ADMIN" }, createdAt: created },
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true,
            email: true,
            state: true,
            localGovt: true,
            organization: true,
            kycVerified: true,
            onboardingCompletedAt: true,
            depositAccountId: true,
            deactivatedAt: true,
            createdAt: true,
          },
          ...pageArgs(cursor),
        })
      );
      return {
        rows: users.length,
        csv: toCsv(
          ["user_id", "role", "first_name", "last_name", "email", "state", "lga", "organization", "kyc_verified", "onboarded", "has_wallet", "deactivated", "signed_up_at"],
          users.map((u) => [u.id, u.role, u.firstName, u.lastName, u.email, u.state, u.localGovt, u.organization, u.kycVerified, u.onboardingCompletedAt !== null, u.depositAccountId !== null, u.deactivatedAt !== null, u.createdAt])
        ),
      };
    }

    case "events": {
      const events = await collect((cursor) =>
        prisma.trainingEvent.findMany({
          where: { createdAt: created },
          select: {
            id: true,
            title: true,
            companyId: true,
            organizationId: true,
            eventCategory: true,
            skillType: true,
            venueType: true,
            delegatesLevel: true,
            location: true,
            startDate: true,
            endDate: true,
            capacity: true,
            trainingBudget: true,
            approval: true,
            paymentConfirmed: true,
            selectedTrainerId: true,
            isCompleted: true,
            isPaid: true,
            createdAt: true,
            _count: { select: { applications: true } },
          },
          ...pageArgs(cursor),
        })
      );
      return {
        rows: events.length,
        csv: toCsv(
          ["event_id", "title", "event_manager_id", "organization_id", "category", "skill_type", "venue_type", "delegates_level", "location", "start_date", "end_date", "capacity", "budget_ngn", "approval", "funded", "trainer_selected", "completed", "paid_out", "applications", "created_at"],
          events.map((e) => [e.id, e.title, e.companyId, e.organizationId, e.eventCategory, e.skillType, e.venueType, e.delegatesLevel, e.location, e.startDate, e.endDate, e.capacity, num(e.trainingBudget), e.approval, e.paymentConfirmed, e.selectedTrainerId !== null, e.isCompleted, e.isPaid, e._count.applications, e.createdAt])
        ),
      };
    }

    case "applications": {
      const applications = await collect((cursor) =>
        prisma.application.findMany({
          where: { appliedAt: created },
          select: { id: true, trainingEventId: true, trainerId: true, status: true, isSelected: true, appliedAt: true, trainingEvent: { select: { title: true } } },
          ...pageArgs(cursor),
        })
      );
      return {
        rows: applications.length,
        csv: toCsv(
          ["application_id", "event_id", "event_title", "facilitator_id", "status", "selected", "applied_at"],
          applications.map((a) => [a.id, a.trainingEventId, a.trainingEvent.title, a.trainerId, a.status, a.isSelected, a.appliedAt])
        ),
      };
    }

    case "transactions": {
      const transactions = await collect((cursor) =>
        prisma.transaction.findMany({
          where: { createdAt: created },
          select: {
            id: true,
            userId: true,
            type: true,
            status: true,
            amount: true,
            feeAmount: true,
            netAmount: true,
            currency: true,
            reference: true,
            relatedTrainingEventId: true,
            createdAt: true,
            // Only for the fee state below — the rest of the metadata is never exported.
            metadata: true,
          },
          ...pageArgs(cursor),
        })
      );
      const feeState = (metadata: unknown) =>
        (metadata && typeof metadata === "object" ? (metadata as { fee?: { status?: string } }).fee?.status : undefined) ?? null;
      return {
        rows: transactions.length,
        csv: toCsv(
          ["transaction_id", "user_id", "type", "status", "amount_ngn", "fee_ngn", "net_ngn", "withdrawal_fee_status", "currency", "reference", "related_event_id", "created_at"],
          transactions.map((t) => [t.id, t.userId, t.type, t.status, num(t.amount), num(t.feeAmount), num(t.netAmount), feeState(t.metadata), t.currency, t.reference, t.relatedTrainingEventId, t.createdAt])
        ),
      };
    }
  }
}
