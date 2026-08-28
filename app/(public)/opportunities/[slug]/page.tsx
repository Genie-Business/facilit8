import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Users, BadgeCheck, GraduationCap, Building2 } from "lucide-react";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { siteUrl, appUrl } from "@/lib/site";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";
import { ShareButton } from "@/components/marketing/share-button";
import { eventStatus, mergedEventStatus } from "@/lib/utils/event-status";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getOpportunity(slug: string) {
  const trainingEvent = await prisma.trainingEvent.findUnique({
    where: { slug },
    include: {
      company: { select: { firstName: true, lastName: true, organization: true } },
      organization: { select: { verificationStatus: true } },
      _count: { select: { applications: true } },
    },
  });
  // Never expose a team-only event on the public marketing site, even to someone who knows
  // or guesses the slug — visitors have no org affiliation to have earned that visibility.
  if (trainingEvent && trainingEvent.visibility === "PUBLIC") {
    return { kind: "training" as const, event: trainingEvent };
  }

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({
    where: { slug },
    include: {
      initiator: { select: { firstName: true, lastName: true, organization: true } },
      organization: { select: { verificationStatus: true } },
      _count: { select: { applications: true } },
    },
  });
  if (mergedEvent && mergedEvent.visibility === "PUBLIC" && !mergedEvent.cancelled) {
    return { kind: "merged" as const, event: mergedEvent };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getOpportunity(slug);
  if (!result) return { title: "Opportunity not found" };

  const { kind, event } = result;
  const postedBy =
    kind === "training"
      ? event.company.organization || `${event.company.firstName} ${event.company.lastName}`
      : event.initiator.organization || `${event.initiator.firstName} ${event.initiator.lastName}`;
  const description = `A training opportunity posted by ${postedBy} in ${event.location}. View details and apply on Facilit8.`;
  const flyerUrl = kind === "training" ? event.flyerImageUrl : null;

  return {
    title: event.title,
    description,
    alternates: { canonical: `/opportunities/${slug}` },
    openGraph: {
      title: event.title,
      description,
      url: `${siteUrl}/opportunities/${slug}`,
      images: flyerUrl ? [{ url: flyerUrl }] : undefined,
    },
    twitter: { card: flyerUrl ? "summary_large_image" : "summary", title: event.title, description },
  };
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.75} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getOpportunity(slug);
  if (!result) notFound();

  const { kind, event } = result;
  const session = await auth();

  const postedBy =
    kind === "training"
      ? event.company.organization || `${event.company.firstName} ${event.company.lastName}`
      : event.initiator.organization || `${event.initiator.firstName} ${event.initiator.lastName}`;
  const postedByVerified = event.organization?.verificationStatus === "VERIFIED";
  const status = kind === "training" ? eventStatus(event) : mergedEventStatus(event);
  const amountLabel =
    kind === "training"
      ? `₦${Number(event.trainingBudget).toLocaleString()}`
      : `₦${Number(event.pricePerDelegate).toLocaleString()} / delegate`;
  const applyHref = kind === "training" ? `${appUrl}/events/${slug}/apply` : `${appUrl}/merged-trainings/${slug}/apply`;
  const shareUrl = `${siteUrl}/opportunities/${slug}`;
  const flyerUrl = kind === "training" ? event.flyerImageUrl : null;

  const isFacilitator = session?.user.role === "FACILITATOR";
  const isSignedIn = !!session;

  return (
    <>
      <MarketingPageHeader eyebrow={kind === "merged" ? "Merged training" : "Training opportunity"} title={event.title} />

      <section className="mx-auto max-w-[1000px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div>
            {flyerUrl && (
              <div className="mb-10 overflow-hidden rounded-2xl border">
                {/* eslint-disable-next-line @next/next/no-img-element -- external upload URL, not statically known */}
                <img src={flyerUrl} alt="" className="h-auto w-full object-cover" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-dark">{status.label}</span>
              {kind === "merged" && (
                <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-medium text-muted-foreground">
                  Merged training
                </span>
              )}
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              Posted by <span className="font-medium text-foreground">{postedBy}</span>
              {postedByVerified && <BadgeCheck className="size-4 shrink-0 text-brand" />}
            </p>

            {(kind === "training" ? event.eventObjective : event.description) && (
              <p className="mt-8 text-base leading-relaxed text-muted-foreground">
                {kind === "training" ? event.eventObjective : event.description}
              </p>
            )}

            {kind === "training" && event.eventDetails && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{event.eventDetails}</p>
            )}

            <div className="mt-10 grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8">
              <DetailRow
                icon={Calendar}
                label="Dates"
                value={`${event.startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${event.endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              />
              <DetailRow icon={MapPin} label="Location" value={event.location} />
              <DetailRow icon={GraduationCap} label="Delegates level" value={event.delegatesLevel} />
              <DetailRow icon={Building2} label="Venue type" value={event.venueType} />
              {kind === "training" && <DetailRow icon={Users} label="Capacity" value={event.capacity} />}
              {kind === "merged" && <DetailRow icon={Users} label="Total slots" value={event.totalSlots} />}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border p-6 sm:p-8">
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="mt-1 text-2xl font-medium tracking-tight text-foreground">{amountLabel}</p>

              <div className="mt-6 flex flex-col gap-3">
                {isFacilitator ? (
                  <HoverRollButton href={applyHref} className="justify-center">
                    Apply to facilitate
                  </HoverRollButton>
                ) : isSignedIn ? (
                  <p className="rounded-xl bg-[#F7FAFB] p-4 text-sm text-muted-foreground">
                    Only Facilitator accounts can bid on this opportunity.
                  </p>
                ) : (
                  <>
                    <HoverRollButton href={`/signup?callbackUrl=${encodeURIComponent(applyHref)}`} className="justify-center">
                      Sign up to apply
                    </HoverRollButton>
                    <p className="text-center text-xs text-muted-foreground">
                      Already have an account?{" "}
                      <Link href={`/login?callbackUrl=${encodeURIComponent(applyHref)}`} className="font-medium text-foreground hover:text-brand">
                        Sign in
                      </Link>
                    </p>
                  </>
                )}
                <ShareButton url={shareUrl} title={event.title} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
