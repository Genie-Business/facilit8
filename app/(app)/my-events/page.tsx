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

const ROLE_TAG_CLASS: Record<string, string> = {
  Created: "t-active",
  Joined: "t-active",
  Invited: "t-info",
  Selected: "t-active",
  Applied: "t-old",
  Rejected: "t-unavail",
};

interface MyEventItem {
  id: string;
  kind: "training" | "merged";
  title: string;
  href: string;
  location: string;
  startDate: Date;
  endDate: Date;
  amountLabel: string;
  statusLabel: string;
  statusVariant: string;
  roleTag: string;
  bidCount?: number;
  createdAt: Date;
}

export default async function MyEventsPage() {
  const session = await auth();
  if (!session) return null;

  const isEventManager = session.user.role === "EVENT_MANAGER";
  const isFacilitator = session.user.role === "FACILITATOR";

  let items: MyEventItem[] = [];

  if (isEventManager) {
    const [ownedTraining, ownedOrJoinedMerged, invitedMerged] = await Promise.all([
      prisma.trainingEvent.findMany({
        where: { companyId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.mergedTrainingEvent.findMany({
        where: {
          OR: [{ initiatorId: session.user.id }, { participants: { some: { companyId: session.user.id } } }],
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.mergedTrainingEvent.findMany({
        where: {
          invites: { some: { companyId: session.user.id } },
          participants: { none: { companyId: session.user.id } },
          initiatorId: { not: session.user.id },
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      }),
    ]);

    items = [
      ...ownedTraining.map((event) => {
        const status = eventStatus(event);
        return {
          id: event.id,
          kind: "training" as const,
          title: event.title,
          href: `/events/${event.slug}`,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          amountLabel: `₦${Number(event.trainingBudget).toLocaleString()}`,
          statusLabel: status.label,
          statusVariant: status.variant,
          roleTag: "Created",
          bidCount: event._count.applications,
          createdAt: event.createdAt,
        };
      }),
      ...ownedOrJoinedMerged.map((event) => {
        const status = mergedEventStatus(event);
        return {
          id: event.id,
          kind: "merged" as const,
          title: event.title,
          href: `/merged-trainings/${event.slug}`,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          amountLabel: `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`,
          statusLabel: status.label,
          statusVariant: status.variant,
          roleTag: event.initiatorId === session.user.id ? "Created" : "Joined",
          bidCount: event._count.applications,
          createdAt: event.createdAt,
        };
      }),
      ...invitedMerged.map((event) => {
        const status = mergedEventStatus(event);
        return {
          id: event.id,
          kind: "merged" as const,
          title: event.title,
          href: `/merged-trainings/${event.slug}`,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          amountLabel: `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`,
          statusLabel: status.label,
          statusVariant: status.variant,
          roleTag: "Invited",
          bidCount: event._count.applications,
          createdAt: event.createdAt,
        };
      }),
    ];
  } else if (isFacilitator) {
    const [trainingEvents, mergerApplications] = await Promise.all([
      prisma.trainingEvent.findMany({
        where: {
          OR: [{ selectedTrainerId: session.user.id }, { applications: { some: { trainerId: session.user.id } } }],
        },
        orderBy: { createdAt: "desc" },
        include: { applications: { where: { trainerId: session.user.id }, select: { status: true } } },
      }),
      prisma.mergerApplication.findMany({
        where: { trainerId: session.user.id },
        orderBy: { appliedAt: "desc" },
        include: { mergedTrainingEvent: true },
      }),
    ]);

    items = [
      ...trainingEvents.map((event) => {
        const status = eventStatus(event);
        const myApplication = event.applications[0];
        return {
          id: event.id,
          kind: "training" as const,
          title: event.title,
          href: `/events/${event.slug}`,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          amountLabel: `₦${Number(event.trainingBudget).toLocaleString()}`,
          statusLabel: status.label,
          statusVariant: status.variant,
          roleTag: myApplication
            ? myApplication.status === "ACCEPTED"
              ? "Selected"
              : myApplication.status === "REJECTED"
                ? "Rejected"
                : "Applied"
            : "Selected",
          createdAt: event.createdAt,
        };
      }),
      ...mergerApplications.map((application) => {
        const event = application.mergedTrainingEvent;
        const status = mergedEventStatus(event);
        return {
          id: application.id,
          kind: "merged" as const,
          title: event.title,
          href: `/merged-trainings/${event.slug}`,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          amountLabel: `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`,
          statusLabel: status.label,
          statusVariant: status.variant,
          roleTag:
            application.status === "ACCEPTED" ? "Selected" : application.status === "REJECTED" ? "Rejected" : "Applied",
          createdAt: application.appliedAt,
        };
      }),
    ];
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">My events</h1>
          <p className="hero-sub">
            {isEventManager
              ? "Events and merged trainings you've created, joined, or been invited to."
              : "Standard and merged trainings you've applied to or been assigned."}
          </p>
        </div>
        {isEventManager && (
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
          <p style={{ color: "var(--t-muted)", fontSize: 13 }}>
            {isEventManager
              ? "You haven't created, joined, or been invited to any events yet."
              : "You haven't applied to or been assigned any events yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {items.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className="card"
              style={{ textDecoration: "none", gap: 12 }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span className={`tag ${item.kind === "merged" ? "t-info" : "t-active"}`}>
                    {item.kind === "merged" ? "Merged training" : "Standard event"}
                  </span>
                  <span className={`tag ${ROLE_TAG_CLASS[item.roleTag] ?? "t-old"}`}>{item.roleTag}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--t-base)" }}>{item.title}</div>
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
                {isEventManager && item.bidCount !== undefined && (
                  <span className="tag t-info">
                    {item.bidCount} bid{item.bidCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
