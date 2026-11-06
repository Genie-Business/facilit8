import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  bucketLabel,
  resolveRange,
  type DateWindow,
  type Granularity,
  type RangeKey,
  type ResolvedRange,
} from "@/lib/analytics/range";

/** A number for this period and, when there's a comparable earlier period, for that one too. */
export interface Metric {
  current: number;
  previous: number | null;
}

export interface TimeSeries<K extends string> {
  keys: readonly K[];
  granularity: Granularity;
  points: { bucket: string; label: string; values: Record<K, number> }[];
}

export interface RankedItem {
  label: string;
  value: number;
}

export type UserRoleKey = "FACILITATOR" | "EVENT_MANAGER" | "PROFESSIONAL";
export type EventKindKey = "standard" | "merged";
export type RevenueSourceKey = "payout_fees" | "chat" | "awe";

export const USER_ROLE_KEYS: readonly UserRoleKey[] = ["FACILITATOR", "EVENT_MANAGER", "PROFESSIONAL"];
export const EVENT_KIND_KEYS: readonly EventKindKey[] = ["standard", "merged"];
export const REVENUE_SOURCE_KEYS: readonly RevenueSourceKey[] = ["payout_fees", "chat", "awe"];

export interface MoneyAnalytics {
  revenue: Metric;
  revenueSeries: TimeSeries<"total">;
  revenueBySource: (RankedItem & { key: RevenueSourceKey; previous: number | null })[];
  fundedVolume: Metric;
  fundedCount: Metric;
  refunded: Metric;
  payouts: { count: Metric; gross: Metric; fees: Metric; net: Metric };
  chat: { count: Metric };
  awe: { count: Metric };
  withdrawals: { count: Metric; volume: Metric };
}

export interface PlatformAnalytics {
  range: ResolvedRange;
  generatedAt: Date;
  users: {
    newUsers: Metric;
    newByRole: Record<UserRoleKey, Metric>;
    series: TimeSeries<UserRoleKey>;
    active: Metric;
    totalByRole: Record<UserRoleKey, number>;
    totalDeactivated: number;
    /** Of the people who signed up in this period. */
    cohort: { signedUp: number; onboarded: number; kycVerified: number; walletReady: number };
    byState: RankedItem[];
  };
  events: {
    newStandard: Metric;
    newMerged: Metric;
    series: TimeSeries<EventKindKey>;
    /** Standard events created in this period, and how far each got. */
    funnel: { created: number; funded: number; withApplications: number; trainerSelected: number; completed: number; paidOut: number };
    applicationsOnCohort: number;
    byCategory: RankedItem[];
    byApproval: RankedItem[];
    applications: Metric;
    applicationSeries: TimeSeries<"applications">;
  };
  engagement: {
    conversationsStarted: Metric;
    messagesSent: Metric;
    aweConversations: Metric;
    aweMessages: Metric;
    aweNewSubscriptions: Metric;
    aweActiveSubscriptions: number;
    awePastDue: number;
    reviews: Metric;
    averageRating: { current: number | null; previous: number | null };
    disputesOpened: Metric;
    disputesOpenNow: number;
  };
  /** Present only for Super Admins — revenue and payment volumes aren't a Support Admin's business. */
  money: MoneyAnalytics | null;
}

// ---------- helpers ----------

const within = (window: DateWindow) => ({ gte: window.from, lt: window.to });
const asTimestamp = (date: Date) => Prisma.sql`${date.toISOString()}::timestamp`;
const num = (value: Prisma.Decimal | number | null | undefined) => (value == null ? 0 : Number(value));

async function forWindows<T>(range: ResolvedRange, run: (window: DateWindow) => Promise<T>) {
  const [current, previous] = await Promise.all([run(range), range.previous ? run(range.previous) : Promise.resolve(null)]);
  return { current, previous };
}

async function metricOf(range: ResolvedRange, run: (window: DateWindow) => Promise<number>): Promise<Metric> {
  return forWindows(range, run);
}

function pick<T>(result: { current: T; previous: T | null }, select: (value: T) => number): Metric {
  return { current: select(result.current), previous: result.previous ? select(result.previous) : null };
}

/** SQL for the bucket a timestamp column falls in, as a Lagos calendar day or month. */
function bucketExpr(column: "createdAt" | "appliedAt", granularity: Granularity) {
  const unit = Prisma.raw(granularity === "day" ? "'day'" : "'month'");
  const format = Prisma.raw(granularity === "day" ? "'YYYY-MM-DD'" : "'YYYY-MM'");
  const col = Prisma.raw(`"${column}"`);
  return Prisma.sql`to_char(date_trunc(${unit}, (${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos'), ${format})`;
}

/** Turns sparse (bucket, key, value) rows into one point per bucket with every key present. */
function fillSeries<K extends string>(
  range: ResolvedRange,
  keys: readonly K[],
  rows: { bucket: string; key: K; value: number }[]
): TimeSeries<K> {
  const byBucket = new Map<string, Record<K, number>>();
  for (const bucket of range.buckets) {
    byBucket.set(bucket, Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>);
  }
  for (const row of rows) {
    const values = byBucket.get(row.bucket);
    if (values) values[row.key] += row.value;
  }
  return {
    keys,
    granularity: range.granularity,
    points: range.buckets.map((bucket) => ({
      bucket,
      label: bucketLabel(bucket, range.granularity),
      values: byBucket.get(bucket)!,
    })),
  };
}

const ZERO_ROLES = (): Record<UserRoleKey, number> => ({ FACILITATOR: 0, EVENT_MANAGER: 0, PROFESSIONAL: 0 });

// ---------- shared metrics ----------

/**
 * Distinct people who did something in the window: applied to an event, posted or funded one,
 * sent a chat message, made a payment, left a review, or talked to Awé. The platform doesn't
 * record logins, so "active" can only mean "acted" — someone who just browsed isn't counted.
 */
function activeUsersMetric(range: ResolvedRange): Promise<Metric> {
  return metricOf(range, async (w) => {
    const rows = await prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT uid)::int AS n FROM (
        SELECT "trainerId" AS uid, "appliedAt" AS at FROM "Application"
        UNION ALL SELECT "trainerId", "appliedAt" FROM "MergerApplication"
        UNION ALL SELECT "companyId", "createdAt" FROM "TrainingEvent"
        UNION ALL SELECT "initiatorId", "createdAt" FROM "MergedTrainingEvent"
        UNION ALL SELECT "companyId", "createdAt" FROM "MergedTrainingParticipant"
        UNION ALL SELECT "senderId", "createdAt" FROM "Message"
        UNION ALL SELECT "userId", "createdAt" FROM "Transaction"
        UNION ALL SELECT "reviewerId", "createdAt" FROM "Review"
        UNION ALL SELECT "userId", "createdAt" FROM "AweConversation"
      ) activity
      WHERE at >= ${asTimestamp(w.from)} AND at < ${asTimestamp(w.to)}`);
    return rows[0]?.n ?? 0;
  });
}

/** Facilitator bids on standard and merged events together. */
function applicationsMetric(range: ResolvedRange): Promise<Metric> {
  return metricOf(range, async (w) => {
    const [standard, merged] = await Promise.all([
      prisma.application.count({ where: { appliedAt: within(w) } }),
      prisma.mergerApplication.count({ where: { appliedAt: within(w) } }),
    ]);
    return standard + merged;
  });
}

// ---------- sections ----------

async function userAnalytics(range: ResolvedRange): Promise<PlatformAnalytics["users"]> {
  const notAdmin = { role: { not: "ADMIN" as const } };

  const [byRole, active, signupRows, totals, deactivated, cohort, states] = await Promise.all([
    forWindows(range, (w) =>
      prisma.user.groupBy({ by: ["role"], where: { ...notAdmin, createdAt: within(w) }, _count: { _all: true } })
    ),
    activeUsersMetric(range),
    prisma.$queryRaw<{ bucket: string; role: UserRoleKey; n: number }[]>(Prisma.sql`
      SELECT ${bucketExpr("createdAt", range.granularity)} AS bucket, role::text AS role, COUNT(*)::int AS n
      FROM "User"
      WHERE role <> 'ADMIN' AND "createdAt" >= ${asTimestamp(range.from)} AND "createdAt" < ${asTimestamp(range.to)}
      GROUP BY 1, 2`),
    prisma.user.groupBy({ by: ["role"], where: notAdmin, _count: { _all: true } }),
    prisma.user.count({ where: { ...notAdmin, deactivatedAt: { not: null } } }),
    (async () => {
      const where = { ...notAdmin, createdAt: within(range) };
      const [signedUp, onboarded, kycVerified, walletReady] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.count({ where: { ...where, onboardingCompletedAt: { not: null } } }),
        prisma.user.count({ where: { ...where, kycVerified: true } }),
        prisma.user.count({ where: { ...where, depositAccountId: { not: null } } }),
      ]);
      return { signedUp, onboarded, kycVerified, walletReady };
    })(),
    prisma.user.groupBy({
      by: ["state"],
      where: { ...notAdmin, createdAt: within(range) },
      _count: { _all: true },
      orderBy: { _count: { state: "desc" } },
      take: 8,
    }),
  ]);

  const countsOf = (rows: { role: string; _count: { _all: number } }[]) => {
    const out = ZERO_ROLES();
    for (const row of rows) if (row.role in out) out[row.role as UserRoleKey] = row._count._all;
    return out;
  };
  const currentByRole = countsOf(byRole.current);
  const previousByRole = byRole.previous ? countsOf(byRole.previous) : null;
  const sum = (counts: Record<UserRoleKey, number>) => USER_ROLE_KEYS.reduce((total, key) => total + counts[key], 0);

  return {
    newUsers: { current: sum(currentByRole), previous: previousByRole ? sum(previousByRole) : null },
    newByRole: Object.fromEntries(
      USER_ROLE_KEYS.map((key) => [key, { current: currentByRole[key], previous: previousByRole ? previousByRole[key] : null }])
    ) as Record<UserRoleKey, Metric>,
    series: fillSeries(
      range,
      USER_ROLE_KEYS,
      signupRows.filter((row) => row.role in ZERO_ROLES()).map((row) => ({ bucket: row.bucket, key: row.role, value: row.n }))
    ),
    active,
    totalByRole: countsOf(totals),
    totalDeactivated: deactivated,
    cohort,
    byState: states.map((row) => ({ label: row.state ?? "Not set", value: row._count._all })),
  };
}

async function eventAnalytics(range: ResolvedRange): Promise<PlatformAnalytics["events"]> {
  const cohort = { createdAt: within(range) };

  const [newStandard, newMerged, eventRows, applications, applicationRows, funnel, applicationsOnCohort, categories, approvals] =
    await Promise.all([
      metricOf(range, (w) => prisma.trainingEvent.count({ where: { createdAt: within(w) } })),
      metricOf(range, (w) => prisma.mergedTrainingEvent.count({ where: { createdAt: within(w) } })),
      prisma.$queryRaw<{ bucket: string; kind: EventKindKey; n: number }[]>(Prisma.sql`
        SELECT ${bucketExpr("createdAt", range.granularity)} AS bucket, kind, COUNT(*)::int AS n FROM (
          SELECT "createdAt", 'standard' AS kind FROM "TrainingEvent"
          UNION ALL
          SELECT "createdAt", 'merged' AS kind FROM "MergedTrainingEvent"
        ) events
        WHERE "createdAt" >= ${asTimestamp(range.from)} AND "createdAt" < ${asTimestamp(range.to)}
        GROUP BY 1, 2`),
      applicationsMetric(range),
      prisma.$queryRaw<{ bucket: string; n: number }[]>(Prisma.sql`
        SELECT ${bucketExpr("appliedAt", range.granularity)} AS bucket, COUNT(*)::int AS n FROM (
          SELECT "appliedAt" FROM "Application"
          UNION ALL
          SELECT "appliedAt" FROM "MergerApplication"
        ) applications
        WHERE "appliedAt" >= ${asTimestamp(range.from)} AND "appliedAt" < ${asTimestamp(range.to)}
        GROUP BY 1`),
      (async () => {
        const [created, funded, withApplications, trainerSelected, completed, paidOut] = await Promise.all([
          prisma.trainingEvent.count({ where: cohort }),
          prisma.trainingEvent.count({ where: { ...cohort, paymentConfirmed: true } }),
          prisma.trainingEvent.count({ where: { ...cohort, applications: { some: {} } } }),
          prisma.trainingEvent.count({ where: { ...cohort, selectedTrainerId: { not: null } } }),
          prisma.trainingEvent.count({ where: { ...cohort, isCompleted: true } }),
          prisma.trainingEvent.count({ where: { ...cohort, isPaid: true } }),
        ]);
        return { created, funded, withApplications, trainerSelected, completed, paidOut };
      })(),
      prisma.application.count({ where: { trainingEvent: cohort } }),
      prisma.trainingEvent.groupBy({
        by: ["eventCategory"],
        where: cohort,
        _count: { _all: true },
        orderBy: { _count: { eventCategory: "desc" } },
        take: 8,
      }),
      prisma.trainingEvent.groupBy({ by: ["approval"], where: cohort, _count: { _all: true } }),
    ]);

  const approvalLabels: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

  return {
    newStandard,
    newMerged,
    series: fillSeries(
      range,
      EVENT_KIND_KEYS,
      eventRows.map((row) => ({ bucket: row.bucket, key: row.kind, value: row.n }))
    ),
    funnel,
    applicationsOnCohort,
    byCategory: categories.map((row) => ({ label: row.eventCategory, value: row._count._all })),
    byApproval: approvals
      .map((row) => ({ label: approvalLabels[row.approval] ?? row.approval, value: row._count._all }))
      .sort((a, b) => b.value - a.value),
    applications,
    applicationSeries: fillSeries(
      range,
      ["applications"] as const,
      applicationRows.map((row) => ({ bucket: row.bucket, key: "applications" as const, value: row.n }))
    ),
  };
}

async function engagementAnalytics(range: ResolvedRange): Promise<PlatformAnalytics["engagement"]> {
  const [
    conversationsStarted,
    messagesSent,
    aweConversations,
    aweMessages,
    aweNewSubscriptions,
    aweActiveSubscriptions,
    awePastDue,
    reviews,
    disputesOpened,
    disputesOpenNow,
  ] = await Promise.all([
    metricOf(range, (w) => prisma.conversation.count({ where: { createdAt: within(w) } })),
    metricOf(range, (w) => prisma.message.count({ where: { createdAt: within(w) } })),
    metricOf(range, (w) => prisma.aweConversation.count({ where: { createdAt: within(w) } })),
    metricOf(range, (w) => prisma.aweMessage.count({ where: { role: "USER", createdAt: within(w) } })),
    metricOf(range, (w) => prisma.aweSubscription.count({ where: { createdAt: within(w) } })),
    prisma.aweSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.aweSubscription.count({ where: { status: "PAST_DUE" } }),
    forWindows(range, (w) => prisma.review.aggregate({ where: { createdAt: within(w) }, _count: { _all: true }, _avg: { rating: true } })),
    metricOf(range, (w) => prisma.dispute.count({ where: { createdAt: within(w) } })),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);

  return {
    conversationsStarted,
    messagesSent,
    aweConversations,
    aweMessages,
    aweNewSubscriptions,
    aweActiveSubscriptions,
    awePastDue,
    reviews: pick(reviews, (value) => value._count._all),
    averageRating: {
      current: reviews.current._avg.rating,
      previous: reviews.previous ? reviews.previous._avg.rating : null,
    },
    disputesOpened,
    disputesOpenNow,
  };
}

async function moneyAnalytics(range: ResolvedRange): Promise<MoneyAnalytics> {
  const successful = (type: "FUNDING" | "REFUND" | "CHAT_PAYMENT" | "AWE_SUBSCRIPTION" | "WITHDRAWAL", w: DateWindow) => ({
    type,
    status: "SUCCESS" as const,
    createdAt: within(w),
  });

  const [funding, refunds, payouts, chat, awe, withdrawals, revenueRows] = await Promise.all([
    forWindows(range, (w) => prisma.transaction.aggregate({ where: successful("FUNDING", w), _sum: { amount: true }, _count: { _all: true } })),
    forWindows(range, (w) => prisma.transaction.aggregate({ where: successful("REFUND", w), _sum: { amount: true } })),
    forWindows(range, (w) =>
      prisma.trainingPayment.aggregate({
        where: { status: "SUCCESS", createdAt: within(w) },
        _sum: { grossAmount: true, feeAmount: true, netAmount: true },
        _count: { _all: true },
      })
    ),
    forWindows(range, (w) => prisma.transaction.aggregate({ where: successful("CHAT_PAYMENT", w), _sum: { amount: true }, _count: { _all: true } })),
    forWindows(range, (w) => prisma.transaction.aggregate({ where: successful("AWE_SUBSCRIPTION", w), _sum: { amount: true }, _count: { _all: true } })),
    forWindows(range, (w) => prisma.transaction.aggregate({ where: successful("WITHDRAWAL", w), _sum: { amount: true }, _count: { _all: true } })),
    prisma.$queryRaw<{ bucket: string; amount: number }[]>(Prisma.sql`
      SELECT ${bucketExpr("createdAt", range.granularity)} AS bucket, SUM(amount)::float8 AS amount FROM (
        SELECT "createdAt", "feeAmount" AS amount FROM "TrainingPayment" WHERE status = 'SUCCESS'
        UNION ALL
        SELECT "createdAt", amount FROM "Transaction"
        WHERE status = 'SUCCESS' AND type IN ('CHAT_PAYMENT', 'AWE_SUBSCRIPTION')
      ) revenue
      WHERE "createdAt" >= ${asTimestamp(range.from)} AND "createdAt" < ${asTimestamp(range.to)}
      GROUP BY 1`),
  ]);

  const payoutFees = pick(payouts, (value) => num(value._sum.feeAmount));
  const chatRevenue = pick(chat, (value) => num(value._sum.amount));
  const aweRevenue = pick(awe, (value) => num(value._sum.amount));
  const add = (...metrics: Metric[]): Metric => ({
    current: metrics.reduce((total, metric) => total + metric.current, 0),
    previous: metrics.every((metric) => metric.previous !== null)
      ? metrics.reduce((total, metric) => total + (metric.previous as number), 0)
      : null,
  });

  const sources: [RevenueSourceKey, string, Metric][] = [
    ["payout_fees", "Facilitator payout fees", payoutFees],
    ["chat", "Chat unlocks", chatRevenue],
    ["awe", "Awé subscriptions", aweRevenue],
  ];

  return {
    revenue: add(payoutFees, chatRevenue, aweRevenue),
    revenueSeries: fillSeries(
      range,
      ["total"] as const,
      revenueRows.map((row) => ({ bucket: row.bucket, key: "total" as const, value: row.amount }))
    ),
    revenueBySource: sources
      .map(([key, label, metric]) => ({ key, label, value: metric.current, previous: metric.previous }))
      .sort((a, b) => b.value - a.value),
    fundedVolume: pick(funding, (value) => num(value._sum.amount)),
    fundedCount: pick(funding, (value) => value._count._all),
    refunded: pick(refunds, (value) => num(value._sum.amount)),
    payouts: {
      count: pick(payouts, (value) => value._count._all),
      gross: pick(payouts, (value) => num(value._sum.grossAmount)),
      fees: payoutFees,
      net: pick(payouts, (value) => num(value._sum.netAmount)),
    },
    chat: { count: pick(chat, (value) => value._count._all) },
    awe: { count: pick(awe, (value) => value._count._all) },
    withdrawals: {
      count: pick(withdrawals, (value) => value._count._all),
      volume: pick(withdrawals, (value) => num(value._sum.amount)),
    },
  };
}

// ---------- entry points ----------

export async function getPlatformAnalytics(
  key: RangeKey,
  options: { includeFinancials: boolean; now?: Date }
): Promise<PlatformAnalytics> {
  const now = options.now ?? new Date();
  const earliest =
    key === "all"
      ? (await prisma.user.aggregate({ where: { role: { not: "ADMIN" } }, _min: { createdAt: true } }))._min.createdAt
      : null;
  const range = resolveRange(key, now, earliest);

  const [users, events, engagement, money] = await Promise.all([
    userAnalytics(range),
    eventAnalytics(range),
    engagementAnalytics(range),
    options.includeFinancials ? moneyAnalytics(range) : Promise.resolve(null),
  ]);

  return { range, generatedAt: now, users, events, engagement, money };
}

export interface QuickStats {
  newUsers: Metric;
  newEvents: Metric;
  applications: Metric;
  activeUsers: Metric;
}

/** The four headline numbers for the admin home page: this week against the week before. */
export async function getQuickStats(now = new Date()): Promise<QuickStats> {
  const range = resolveRange("7d", now, null);
  const [newUsers, newEvents, applications, activeUsers] = await Promise.all([
    metricOf(range, (w) => prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: within(w) } })),
    metricOf(range, async (w) => {
      const [standard, merged] = await Promise.all([
        prisma.trainingEvent.count({ where: { createdAt: within(w) } }),
        prisma.mergedTrainingEvent.count({ where: { createdAt: within(w) } }),
      ]);
      return standard + merged;
    }),
    applicationsMetric(range),
    activeUsersMetric(range),
  ]);
  return { newUsers, newEvents, applications, activeUsers };
}
