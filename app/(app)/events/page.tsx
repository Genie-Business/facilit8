import Link from "next/link";
import { Plus, MapPin, Calendar } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventStatus, mergedEventStatus } from "@/lib/utils/event-status";

const STATUS_TAG: Record<string, string> = {
  default: "t-info",
  secondary: "t-active",
  outline: "t-old",
};

interface BrowseItem {
  id: string;
  kind: "training" | "merged";
  title: string;
  href: string;
  postedBy: string;
  location: string;
  startDate: Date;
  endDate: Date;
  amountLabel: string;
  statusLabel: string;
  statusVariant: string;
  bidCount: number;
  isOwner: boolean;
  hasApplied: boolean;
  createdAt: Date;
}

export default async function EventsPage() {
  const session = await auth();
  if (!session) return null;

  const [trainingEvents, mergedEvents] = await Promise.all([
    prisma.trainingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        company: { select: { firstName: true, lastName: true, organization: true } },
        _count: { select: { applications: true } },
        applications: { where: { trainerId: session.user.id }, select: { id: true } },
      },
    }),
    prisma.mergedTrainingEvent.findMany({
      where: { isPostedToBoard: true, cancelled: false },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        initiator: { select: { firstName: true, lastName: true, organization: true } },
        _count: { select: { applications: true } },
        applications: { where: { trainerId: session.user.id }, select: { id: true } },
      },
    }),
  ]);

  const items: BrowseItem[] = [
    ...trainingEvents.map((event) => {
      const status = eventStatus(event);
      return {
        id: event.id,
        kind: "training" as const,
        title: event.title,
        href: `/events/${event.slug}`,
        postedBy: event.company.organization || `${event.company.firstName} ${event.company.lastName}`,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        amountLabel: `₦${Number(event.trainingBudget).toLocaleString()}`,
        statusLabel: status.label,
        statusVariant: status.variant,
        bidCount: event._count.applications,
        isOwner: event.companyId === session.user.id,
        hasApplied: event.applications.length > 0,
        createdAt: event.createdAt,
      };
    }),
    ...mergedEvents.map((event) => {
      const status = mergedEventStatus(event);
      return {
        id: event.id,
        kind: "merged" as const,
        title: event.title,
        href: `/merged-trainings/${event.slug}`,
        postedBy: event.initiator.organization || `${event.initiator.firstName} ${event.initiator.lastName}`,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        amountLabel: `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`,
        statusLabel: status.label,
        statusVariant: status.variant,
        bidCount: event._count.applications,
        isOwner: event.initiatorId === session.user.id,
        hasApplied: event.applications.length > 0,
        createdAt: event.createdAt,
      };
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">Browse events</h1>
          <p className="hero-sub">
            {items.length} training need{items.length === 1 ? "" : "s"} posted across the marketplace.
          </p>
        </div>
        {session.user.role === "EVENT_MANAGER" && (
          <div className="hero-actions">
            <Link href="/events/new" className="btn btn--primary">
              <Plus />
              New event
            </Link>
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <div className="card col-12">
          <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No events have been created yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="card" style={{ textDecoration: "none", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span className={`tag ${item.kind === "merged" ? "t-info" : "t-active"}`}>
                    {item.kind === "merged" ? "Merged training" : "Standard event"}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--t-base)", marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--t-muted)" }}>Posted by {item.postedBy}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--t-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  {item.location}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar style={{ width: 13, height: 13 }} />
                  {item.startDate.toLocaleDateString()} – {item.endDate.toLocaleDateString()}
                </span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t-base)" }}>{item.amountLabel}</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span className={`tag ${STATUS_TAG[item.statusVariant] ?? "t-info"}`}>{item.statusLabel}</span>
                <span className="tag t-info">
                  {item.bidCount} bid{item.bidCount === 1 ? "" : "s"}
                </span>
                {item.isOwner && <span className="tag t-active">Yours</span>}
                {!item.isOwner && item.hasApplied && <span className="tag t-old">Applied</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
