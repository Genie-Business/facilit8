import Link from "next/link";
import { notFound } from "next/navigation";
import { Send } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteEventAction } from "@/lib/actions/event.actions";
import { completeEventAction } from "@/lib/actions/event-funding.actions";
import { FundEventButton } from "@/components/events/fund-event-button";
import { eventStatus } from "@/lib/utils/event-status";

const STATUS_TAG: Record<string, string> = {
  default: "t-info",
  secondary: "t-active",
  outline: "t-old",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div style={{ color: "var(--t-muted)" }}>{label}</div>
      <div style={{ color: "var(--t-base)" }}>{value}</div>
    </>
  );
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const event = await prisma.trainingEvent.findUnique({
    where: { slug },
    include: {
      company: { select: { firstName: true, lastName: true, organization: true } },
      selectedTrainer: { select: { firstName: true, lastName: true, slug: true } },
      _count: { select: { applications: true } },
      applications: {
        where: { trainerId: session.user.id },
        select: { id: true, status: true },
      },
    },
  });
  if (!event) notFound();

  const isOwner = event.companyId === session.user.id;
  const isFacilitator = session.user.role === "FACILITATOR";
  const myApplication = event.applications[0];
  const status = eventStatus(event);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">{event.title}</h1>
          <p className="hero-sub">
            Posted by {event.company.organization || `${event.company.firstName} ${event.company.lastName}`}
          </p>
        </div>
        <div className="hero-actions">
          <span className={`tag ${STATUS_TAG[status.variant] ?? "t-info"}`} style={{ alignSelf: "center" }}>
            {status.label}
          </span>
        </div>
      </section>

      <div className="grid">
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Overview</span>
              <h2 className="card-title">Details</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
            <DetailRow
              label="Dates"
              value={`${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()} (${event.durationDays} days)`}
            />
            <DetailRow label="Application deadline" value={event.eventExpiryDate.toLocaleDateString()} />
            <DetailRow label="Location" value={event.location} />
            <DetailRow label="Capacity" value={event.capacity} />
            <DetailRow label="Budget" value={`₦${Number(event.trainingBudget).toLocaleString()}`} />
            <DetailRow label="Skill type" value={event.skillType} />
            <DetailRow label="Category" value={event.eventCategory} />
            <DetailRow label="Delegates level" value={event.delegatesLevel} />
            <DetailRow label="Venue type" value={event.venueType} />
            {event.selectedTrainer && (
              <DetailRow
                label="Selected facilitator"
                value={
                  <Link href={`/facilitators/${event.selectedTrainer.slug}`} style={{ color: "var(--primary)" }}>
                    {event.selectedTrainer.firstName} {event.selectedTrainer.lastName}
                  </Link>
                }
              />
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            {isOwner && (
              <>
                {!event.paymentConfirmed && <FundEventButton slug={event.slug} eventId={event.id} />}

                {event.paymentConfirmed && (
                  <Link href={`/events/${event.slug}/applications`} className="btn btn--primary">
                    Applications ({event._count.applications})
                  </Link>
                )}

                {!event.selectedTrainerId && !event.paymentConfirmed && (
                  <>
                    <Link href={`/events/${event.slug}/edit`} className="btn btn--secondary">
                      Edit
                    </Link>
                    <form action={deleteEventAction}>
                      <input type="hidden" name="slug" value={event.slug} />
                      <button type="submit" className="btn btn--danger">
                        Delete
                      </button>
                    </form>
                  </>
                )}

                {event.paymentConfirmed && event.selectedTrainerId && !event.isCompleted && (
                  <form action={completeEventAction}>
                    <input type="hidden" name="slug" value={event.slug} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <button type="submit" className="btn btn--primary">
                      Mark complete &amp; pay facilitator
                    </button>
                  </form>
                )}
              </>
            )}

            {!isOwner && isFacilitator && (
              <>
                {myApplication ? (
                  <button type="button" disabled className="btn btn--secondary">
                    Applied ({myApplication.status})
                  </button>
                ) : event.isAvailable ? (
                  <Link href={`/events/${event.slug}/apply`} className="btn btn--primary">
                    <Send />
                    Apply to facilitate
                  </Link>
                ) : (
                  <button type="button" disabled className="btn btn--secondary">
                    {event.paymentConfirmed ? "No longer accepting applications" : "Not yet open: awaiting funding"}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {(event.eventObjective || event.eventDetails) && (
          <section className="col-6 card">
            <div className="card-head">
              <div className="card-title-wrap">
                <span className="eyebrow">Notes</span>
                <h2 className="card-title">Objective &amp; details</h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "var(--t-muted)", lineHeight: 1.6 }}>
              {event.eventObjective && (
                <p>
                  <strong style={{ color: "var(--t-base)" }}>Objective:</strong> {event.eventObjective}
                </p>
              )}
              {event.eventDetails && (
                <p>
                  <strong style={{ color: "var(--t-base)" }}>Additional details:</strong> {event.eventDetails}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
