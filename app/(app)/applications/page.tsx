import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Bids",
  robots: { index: false, follow: false },
};

const STATUS_TAG: Record<string, string> = {
  PENDING: "t-old",
  ACCEPTED: "t-active",
  REJECTED: "t-unavail",
};

interface BidRow {
  id: string;
  eventTitle: string;
  eventHref: string;
  reviewHref: string;
  kind: "Training" | "Merged training";
  counterpartyName: string;
  counterpartyHref: string | null;
  budgetPerDelegate: number;
  status: string;
  appliedAt: Date;
}

export default async function BidsPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const userId = session.user.id;

  let bids: BidRow[] = [];
  let heading = "Bids";
  let subtitle = "";

  if (role === "FACILITATOR") {
    heading = "My bids";
    subtitle = "Every bid you've submitted, across single events and merged training, in one place.";

    const [applications, mergerApplications] = await Promise.all([
      prisma.application.findMany({
        where: { trainerId: userId },
        orderBy: { appliedAt: "desc" },
        include: { trainingEvent: { select: { title: true, slug: true, companyId: true, company: { select: { firstName: true, lastName: true, organization: true, slug: true } } } } },
      }),
      prisma.mergerApplication.findMany({
        where: { trainerId: userId },
        orderBy: { appliedAt: "desc" },
        include: { mergedTrainingEvent: { select: { title: true, slug: true, initiator: { select: { firstName: true, lastName: true, organization: true, slug: true } } } } },
      }),
    ]);

    bids = [
      ...applications.map((a) => ({
        id: a.id,
        eventTitle: a.trainingEvent.title,
        eventHref: `/events/${a.trainingEvent.slug}`,
        reviewHref: `/applications/${a.slug}`,
        kind: "Training" as const,
        counterpartyName: a.trainingEvent.company.organization || `${a.trainingEvent.company.firstName} ${a.trainingEvent.company.lastName}`,
        // Event Managers don't have a public profile page — text only, no link.
        counterpartyHref: null,
        budgetPerDelegate: Number(a.budgetPerDelegate),
        status: a.status,
        appliedAt: a.appliedAt,
      })),
      ...mergerApplications.map((a) => ({
        id: a.id,
        eventTitle: a.mergedTrainingEvent.title,
        eventHref: `/merged-trainings/${a.mergedTrainingEvent.slug}`,
        // The applications/voting page is restricted to funding participants — a bidding
        // trainer isn't one, so send them to the merged training's own overview instead.
        reviewHref: `/merged-trainings/${a.mergedTrainingEvent.slug}`,
        kind: "Merged training" as const,
        counterpartyName:
          a.mergedTrainingEvent.initiator.organization ||
          `${a.mergedTrainingEvent.initiator.firstName} ${a.mergedTrainingEvent.initiator.lastName}`,
        counterpartyHref: null,
        budgetPerDelegate: Number(a.budgetPerDelegate),
        status: a.status,
        appliedAt: a.appliedAt,
      })),
    ].sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  } else if (role === "EVENT_MANAGER") {
    heading = "Bids received";
    subtitle = "Every bid facilitators have submitted to your events and merged trainings.";

    const [applications, mergerApplications] = await Promise.all([
      prisma.application.findMany({
        where: { trainingEvent: { companyId: userId } },
        orderBy: { appliedAt: "desc" },
        include: { trainingEvent: { select: { title: true, slug: true } }, trainer: { select: { firstName: true, lastName: true, slug: true } } },
      }),
      prisma.mergerApplication.findMany({
        where: { mergedTrainingEvent: { initiatorId: userId } },
        orderBy: { appliedAt: "desc" },
        include: { mergedTrainingEvent: { select: { title: true, slug: true } }, trainer: { select: { firstName: true, lastName: true, slug: true } } },
      }),
    ]);

    bids = [
      ...applications.map((a) => ({
        id: a.id,
        eventTitle: a.trainingEvent.title,
        eventHref: `/events/${a.trainingEvent.slug}`,
        reviewHref: `/events/${a.trainingEvent.slug}/applications`,
        kind: "Training" as const,
        counterpartyName: `${a.trainer.firstName} ${a.trainer.lastName}`,
        counterpartyHref: `/facilitators/${a.trainer.slug}`,
        budgetPerDelegate: Number(a.budgetPerDelegate),
        status: a.status,
        appliedAt: a.appliedAt,
      })),
      ...mergerApplications.map((a) => ({
        id: a.id,
        eventTitle: a.mergedTrainingEvent.title,
        eventHref: `/merged-trainings/${a.mergedTrainingEvent.slug}`,
        reviewHref: `/merged-trainings/${a.mergedTrainingEvent.slug}/applications`,
        kind: "Merged training" as const,
        counterpartyName: `${a.trainer.firstName} ${a.trainer.lastName}`,
        counterpartyHref: `/facilitators/${a.trainer.slug}`,
        budgetPerDelegate: Number(a.budgetPerDelegate),
        status: a.status,
        appliedAt: a.appliedAt,
      })),
    ].sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  }

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">{heading}</h1>
          {subtitle && <p className="hero-sub">{subtitle}</p>}
        </div>
      </section>

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Bids</span>
              <h2 className="card-title">{bids.length} total</h2>
            </div>
          </div>

          {role === "PROFESSIONAL" ? (
            <p style={{ color: "var(--t-muted)", fontSize: 13 }}>
              Bids apply to Event Managers and Facilitators — Professional accounts don&apos;t submit or receive them.
            </p>
          ) : bids.length === 0 ? (
            <p style={{ color: "var(--t-muted)", fontSize: 13 }}>
              {role === "FACILITATOR" ? "You haven't submitted any bids yet." : "You haven't received any bids yet."}
            </p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>{role === "FACILITATOR" ? "Event Manager" : "Facilitator"}</th>
                    <th>Type</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Budget / delegate</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid) => (
                    <tr key={bid.id}>
                      <td className="cell-name">
                        <Link href={bid.reviewHref}>{bid.eventTitle}</Link>
                      </td>
                      <td style={{ color: "var(--t-muted)" }}>
                        {bid.counterpartyHref ? (
                          <Link href={bid.counterpartyHref}>{bid.counterpartyName}</Link>
                        ) : (
                          bid.counterpartyName
                        )}
                      </td>
                      <td className="cell-date">{bid.kind}</td>
                      <td className="cell-date">
                        {bid.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <span className={`tag ${STATUS_TAG[bid.status] ?? "t-info"}`}>{bid.status}</span>
                      </td>
                      <td className="cell-price">₦{bid.budgetPerDelegate.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
