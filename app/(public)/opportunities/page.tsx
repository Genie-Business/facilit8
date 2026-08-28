import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Calendar, Users, BadgeCheck } from "lucide-react";

import { prisma } from "@/lib/db";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { eventStatus, mergedEventStatus } from "@/lib/utils/event-status";

export const metadata: Metadata = {
  title: "Training Opportunities",
  description:
    "Browse open training opportunities from organizations across Nigeria on Facilit8 — sign up as a facilitator to bid, or as a professional to grow.",
  alternates: { canonical: "/opportunities" },
};

interface Card {
  id: string;
  kind: "training" | "merged";
  slug: string;
  title: string;
  postedBy: string;
  postedByVerified: boolean;
  location: string;
  startDate: Date;
  endDate: Date;
  amountLabel: string;
  statusLabel: string;
  statusVariant: string;
  createdAt: Date;
}

const STATUS_STYLE: Record<string, string> = {
  secondary: "bg-brand/10 text-brand-dark",
  outline: "bg-[#F5F5F5] text-muted-foreground",
  default: "bg-foreground text-background",
};

export default async function OpportunitiesPage() {
  const [trainingEvents, mergedEvents] = await Promise.all([
    prisma.trainingEvent.findMany({
      where: { visibility: "PUBLIC", approval: "APPROVED", isAvailable: true },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        company: { select: { firstName: true, lastName: true, organization: true } },
        organization: { select: { verificationStatus: true } },
      },
    }),
    prisma.mergedTrainingEvent.findMany({
      where: { visibility: "PUBLIC", isPostedToBoard: true, cancelled: false, isFullyFunded: false },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        initiator: { select: { firstName: true, lastName: true, organization: true } },
        organization: { select: { verificationStatus: true } },
      },
    }),
  ]);

  const items: Card[] = [
    ...trainingEvents.map((event) => {
      const status = eventStatus(event);
      return {
        id: event.id,
        kind: "training" as const,
        slug: event.slug,
        title: event.title,
        postedBy: event.company.organization || `${event.company.firstName} ${event.company.lastName}`,
        postedByVerified: event.organization?.verificationStatus === "VERIFIED",
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        amountLabel: `₦${Number(event.trainingBudget).toLocaleString()}`,
        statusLabel: status.label,
        statusVariant: status.variant,
        createdAt: event.createdAt,
      };
    }),
    ...mergedEvents.map((event) => {
      const status = mergedEventStatus(event);
      return {
        id: event.id,
        kind: "merged" as const,
        slug: event.slug,
        title: event.title,
        postedBy: event.initiator.organization || `${event.initiator.firstName} ${event.initiator.lastName}`,
        postedByVerified: event.organization?.verificationStatus === "VERIFIED",
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        amountLabel: `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`,
        statusLabel: status.label,
        statusVariant: status.variant,
        createdAt: event.createdAt,
      };
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <>
      <MarketingPageHeader
        eyebrow="Training Opportunities"
        title="Real training work, posted by real organizations."
        description="Every opportunity here is open right now. Sign up as a facilitator to bid, or explore what's happening across Nigeria's training ecosystem."
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-24 text-center">
            <p className="text-base text-muted-foreground">No open opportunities right now — check back soon.</p>
          </div>
        ) : (
          <>
            <p className="mb-10 text-sm text-muted-foreground">
              {items.length} open opportunit{items.length === 1 ? "y" : "ies"}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/opportunities/${item.slug}`}
                  className="group flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${item.kind === "merged" ? "bg-[#F5F5F5] text-muted-foreground" : STATUS_STYLE[item.statusVariant]}`}
                    >
                      {item.kind === "merged" ? "Merged training" : item.statusLabel}
                    </span>
                    {item.kind === "training" && (
                      <span className="text-xs text-muted-foreground">{item.statusLabel === "Open" ? "Accepting bids" : ""}</span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg leading-snug font-medium tracking-tight text-foreground transition-colors group-hover:text-brand-dark">
                      {item.title}
                    </h2>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {item.postedBy}
                      {item.postedByVerified && <BadgeCheck className="size-3.5 shrink-0 text-brand" />}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="size-3.5 shrink-0" />
                      {item.startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                      {item.endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Users className="size-3.5 shrink-0 text-muted-foreground" />
                      {item.amountLabel}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
