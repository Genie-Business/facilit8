import Link from "next/link";
import {
  Plus,
  Handshake,
  Users,
  MessageCircle,
  Search,
  ArrowRight,
  Building2,
  Wallet,
  CalendarDays,
  Bell,
  Receipt,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWalletBalance } from "@/lib/services/wallet.service";
import { getUserOrganizationMembership, listPendingMembershipRequests } from "@/lib/services/organization.service";
import { eventStatus } from "@/lib/utils/event-status";
import { MembershipRequestRow } from "@/components/dashboard/membership-request-row";

const EVENT_MANAGER_ACTIONS = [
  { href: "/events/new", label: "New event", icon: Plus, variant: "primary" as const },
  { href: "/merged-trainings/new", label: "Start merged training", icon: Handshake, variant: "ghost" as const },
  { href: "/facilitators", label: "Browse facilitators", icon: Users, variant: "ghost" as const },
];

const FACILITATOR_ACTIONS = [
  { href: "/events", label: "Browse events", icon: Search, variant: "primary" as const },
  { href: "/merged-trainings", label: "Merged training", icon: Handshake, variant: "ghost" as const },
  { href: "/my-events", label: "My applications", icon: Users, variant: "ghost" as const },
];

const PROFESSIONAL_ACTIONS = [
  { href: "/facilitators", label: "Browse facilitators", icon: Users, variant: "primary" as const },
  { href: "/events", label: "Browse events", icon: Search, variant: "ghost" as const },
];

const TRANSACTION_TAG_CLASS: Record<string, string> = {
  SUCCESS: "t-active",
  PENDING: "t-old",
  FAILED: "t-unavail",
  REVERSED: "t-info",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const isEventManager = role === "EVENT_MANAGER";
  const userId = session.user.id;
  const actions =
    role === "EVENT_MANAGER" ? EVENT_MANAGER_ACTIONS : role === "FACILITATOR" ? FACILITATOR_ACTIONS : PROFESSIONAL_ACTIONS;

  const upcomingWhere = isEventManager
    ? { companyId: userId, startDate: { gte: new Date() } }
    : role === "FACILITATOR"
      ? { selectedTrainerId: userId, startDate: { gte: new Date() } }
      : { id: "__none__" };

  const [
    balance,
    upcoming,
    upcomingCount,
    transactions,
    transactionCount,
    unreadCount,
    membership,
    pendingRequests,
    onboarding,
  ] = await Promise.all([
    getWalletBalance(userId),
    role === "PROFESSIONAL"
      ? Promise.resolve([])
      : prisma.trainingEvent.findMany({ where: upcomingWhere, orderBy: { startDate: "asc" }, take: 4 }),
    role === "PROFESSIONAL" ? Promise.resolve(0) : prisma.trainingEvent.count({ where: upcomingWhere }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.transaction.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    role === "PROFESSIONAL" ? getUserOrganizationMembership(userId) : Promise.resolve(null),
    isEventManager ? listPendingMembershipRequests(userId) : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingSkippedAt: true, onboardingCompletedAt: true },
    }),
  ]);

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const showOnboardingNudge = !!onboarding?.onboardingSkippedAt && !onboarding?.onboardingCompletedAt;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Workspace</span>
          <h1 className="hero-title">
            Welcome back, <span className="accent">{firstName}</span>
          </h1>
          <p className="hero-sub">Here&apos;s what&apos;s happening with your Facilit8 account today.</p>
        </div>
        <div className="hero-actions">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={`btn btn--${action.variant}`}>
              <action.icon />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {showOnboardingNudge && (
        <section
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            borderLeft: "3px solid var(--primary)",
          }}
        >
          <div>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>Finish setting up your profile</p>
            <p style={{ fontSize: 13, color: "var(--t-muted)" }}>
              You skipped a few steps earlier — finishing them helps Awe give you sharper, more relevant
              recommendations.
            </p>
          </div>
          <Link href="/onboarding" className="btn btn--primary">
            Continue setup
          </Link>
        </section>
      )}

      <section className="kpi-grid" aria-label="Key metrics">
        <article className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon primary">
                <Wallet />
              </div>
              <div className="kpi-label">Wallet balance</div>
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: 30 }}>
            ₦{balance.toLocaleString()}
          </div>
          <div className="kpi-compare">
            <Link href="/wallet" className="card-action">
              View wallet <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon info">
                <CalendarDays />
              </div>
              <div className="kpi-label">Upcoming events</div>
            </div>
          </div>
          <div className="kpi-value">{upcomingCount}</div>
          <div className="kpi-compare">
            <Link href="/calendar" className="card-action">
              View calendar <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon danger">
                <Bell />
              </div>
              <div className="kpi-label">Unread notifications</div>
            </div>
          </div>
          <div className="kpi-value">{unreadCount}</div>
          <div className="kpi-compare">
            <Link href="/notifications" className="card-action">
              View all <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-identity">
              <div className="kpi-icon purple">
                <Receipt />
              </div>
              <div className="kpi-label">Total transactions</div>
            </div>
          </div>
          <div className="kpi-value">{transactionCount}</div>
          <div className="kpi-compare">
            <Link href="/wallet/transactions" className="card-action">
              View history <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </div>
        </article>
      </section>

      {role === "PROFESSIONAL" && (
        <div className="grid" style={{ marginBottom: 20 }}>
          <section className="col-12 card">
            <div className="card-head">
              <div className="card-title-wrap">
                <span className="eyebrow">Affiliation</span>
                <h2 className="card-title">Organization affiliation</h2>
              </div>
            </div>
            {!membership ? (
              <p style={{ color: "var(--t-muted)", fontSize: 13 }}>
                You&apos;re signed up as an independent professional — not affiliated with an organization.
              </p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 style={{ height: 14, width: 14 }} />
                  {membership.status === "APPROVED"
                    ? "Member of"
                    : membership.status === "PENDING"
                      ? "Requested to join"
                      : "Request declined for"}{" "}
                  <strong>{membership.organization.name}</strong>
                </p>
                <span
                  className={`badge ${membership.status === "APPROVED" ? "success" : membership.status === "PENDING" ? "warning" : "danger"}`}
                >
                  {membership.status}
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      {isEventManager && pendingRequests.length > 0 && (
        <div className="grid" style={{ marginBottom: 20 }}>
          <section className="col-12 card">
            <div className="card-head">
              <div className="card-title-wrap">
                <span className="eyebrow">Requests</span>
                <h2 className="card-title">Membership requests</h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pendingRequests.map((request) => (
                <MembershipRequestRow
                  key={request.id}
                  membershipId={request.id}
                  name={`${request.user.firstName} ${request.user.lastName}`}
                  organizationName={request.organization.name}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="grid">
        {role !== "PROFESSIONAL" && (
          <section className="col-6 card">
            <div className="card-head">
              <div className="card-title-wrap">
                <span className="eyebrow">Schedule</span>
                <h2 className="card-title">Upcoming events</h2>
              </div>
              <Link className="card-action" href="/calendar">
                View calendar
                <ArrowRight style={{ height: 12, width: 12 }} />
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ color: "var(--t-muted)", fontSize: 13 }}>Nothing on the horizon yet.</p>
            ) : (
              <div className="upc-list">
                {upcoming.map((event) => {
                  const status = eventStatus(event);
                  return (
                    <Link key={event.id} href={`/events/${event.slug}`} className="upc-item">
                      <div className="upc-date">
                        <div className="day">{event.startDate.getDate()}</div>
                        <span className="mo">{event.startDate.toLocaleDateString("en-US", { month: "short" })}</span>
                      </div>
                      <div className="upc-meta">
                        <div className="upc-title">{event.title}</div>
                        <div className="upc-time">
                          <span
                            className="dot"
                            style={{ background: `var(--${status.variant === "secondary" ? "success" : "info"})` }}
                          />
                          <span>{status.label}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className={role === "PROFESSIONAL" ? "col-12 card" : "col-6 card"}>
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Ledger</span>
              <h2 className="card-title">Recent transactions</h2>
            </div>
            <Link className="card-action" href="/wallet/transactions">
              View all
              <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </div>
          {transactions.length === 0 ? (
            <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No transactions yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="cell-name">{tx.description ?? tx.type}</td>
                      <td className="cell-date">
                        {tx.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <span className={`tag ${TRANSACTION_TAG_CLASS[tx.status] ?? "t-info"}`}>{tx.status}</span>
                      </td>
                      <td className={`cell-price ${tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "neg" : "pos"}`}>
                        {tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "−" : ""}₦{Number(tx.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {role === "PROFESSIONAL" && (
        <div className="hero-actions" style={{ marginTop: 20 }}>
          <Link href="/chat" className="btn btn--ghost">
            <MessageCircle />
            Messages
          </Link>
        </div>
      )}
    </>
  );
}
