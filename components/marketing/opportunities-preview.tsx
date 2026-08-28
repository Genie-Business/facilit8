import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";

import { prisma } from "@/lib/db";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export async function OpportunitiesPreview() {
  const events = await prisma.trainingEvent.findMany({
    where: { visibility: "PUBLIC", approval: "APPROVED", isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      company: { select: { firstName: true, lastName: true, organization: true } },
      organization: { select: { verificationStatus: true } },
    },
  });

  // Nothing to show yet — skip the section entirely rather than embed an empty state
  // mid-homepage.
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <span className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Live on the platform
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
            Real training work, posted this week.
          </h2>
        </div>
        <HoverRollButton href="/opportunities" variant="outline" className="shrink-0">
          View all opportunities
        </HoverRollButton>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {events.map((event) => {
          const postedBy = event.company.organization || `${event.company.firstName} ${event.company.lastName}`;
          const postedByVerified = event.organization?.verificationStatus === "VERIFIED";
          return (
            <Link
              key={event.id}
              href={`/opportunities/${event.slug}`}
              className="group flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
            >
              <span className="w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-dark">Open</span>
              <div>
                <h3 className="text-lg leading-snug font-medium tracking-tight text-foreground transition-colors group-hover:text-brand-dark">
                  {event.title}
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {postedBy}
                  {postedByVerified && <BadgeCheck className="size-3.5 shrink-0 text-brand" />}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {event.location}
                </span>
                <span className="font-semibold text-foreground">₦{Number(event.trainingBudget).toLocaleString()}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
