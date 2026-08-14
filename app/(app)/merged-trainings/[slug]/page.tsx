import Link from "next/link";
import { notFound } from "next/navigation";
import { Send } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  cancelMergedTrainingAction,
  completeMergedTrainingAction,
  respondToCoFacilitatorInviteAction,
} from "@/lib/actions/merged-training.actions";
import { JoinForm } from "@/components/merged-training/join-form";
import { PayShareForm } from "@/components/merged-training/pay-share-form";
import { StageTracker } from "@/components/merged-training/stage-tracker";
import { mergedTrainingProgress } from "@/lib/utils/merged-training-stages";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div style={{ color: "var(--t-muted)" }}>{label}</div>
      <div style={{ color: "var(--t-base)" }}>{value}</div>
    </>
  );
}

export default async function MergedTrainingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({
    where: { slug },
    include: {
      initiator: { select: { firstName: true, lastName: true, organization: true, role: true } },
      selectedTrainer: { select: { firstName: true, lastName: true, slug: true } },
      participants: { include: { company: { select: { firstName: true, lastName: true, organization: true } } } },
      invites: { include: { company: { select: { id: true, firstName: true, lastName: true, role: true } } } },
      coFacilitators: { include: { facilitator: { select: { id: true, firstName: true, lastName: true } } } },
      _count: { select: { applications: true } },
    },
  });
  if (!mergedEvent) notFound();

  const myCoFacilitatorInvite = mergedEvent.coFacilitators.find(
    (c) => c.facilitatorId === session.user.id && c.status === "PENDING"
  );

  const isInitiator = mergedEvent.initiatorId === session.user.id;
  const myParticipant = mergedEvent.participants.find((p) => p.companyId === session.user.id);
  const fundedSlots = mergedEvent.participants.filter((p) => p.hasPaid).reduce((sum, p) => sum + p.numDelegates, 0);
  const reservedSlots = mergedEvent.participants.reduce((sum, p) => sum + p.numDelegates, 0);
  const remainingSlots = mergedEvent.totalSlots - reservedSlots;
  const pct = Math.min(100, Math.round((fundedSlots / mergedEvent.totalSlots) * 100));

  const canJoin =
    ["EVENT_MANAGER", "PROFESSIONAL"].includes(session.user.role) &&
    !isInitiator &&
    !myParticipant &&
    !mergedEvent.cancelled &&
    !mergedEvent.isFullyFunded &&
    new Date() <= mergedEvent.deadline &&
    remainingSlots > 0 &&
    (!mergedEvent.isInviteOnly || mergedEvent.invites.some((i) => i.companyId === session.user.id));

  const votingOpen = new Date() > mergedEvent.deadline;
  const progress = mergedTrainingProgress(mergedEvent);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">{mergedEvent.title}</h1>
          <p className="hero-sub">
            Initiated by{" "}
            {mergedEvent.initiator.organization || `${mergedEvent.initiator.firstName} ${mergedEvent.initiator.lastName}`}
            {mergedEvent.description ? ` · ${mergedEvent.description}` : ""}
          </p>
        </div>
        <div className="hero-actions">
          {mergedEvent.cancelled && <span className="tag t-unavail">Cancelled</span>}
          {!mergedEvent.cancelled && mergedEvent.isFullyFunded && <span className="tag t-active">Fully funded</span>}
          {!mergedEvent.cancelled && !mergedEvent.isFullyFunded && <span className="tag t-old">Funding</span>}
          {mergedEvent.isCompleted && <span className="tag t-info">Completed</span>}
        </div>
      </section>

      <div className="card col-12">
        <div className="card-head">
          <div className="card-title-wrap">
            <span className="eyebrow">Progress</span>
            <h2 className="card-title">Where this session stands</h2>
          </div>
        </div>
        <div style={{ paddingTop: 8 }}>
          <StageTracker stages={progress.stages} currentIndex={progress.currentIndex} />
        </div>
      </div>

      <div className="grid">
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Overview</span>
              <h2 className="card-title">Details</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
            <DetailRow label="Dates" value={`${mergedEvent.startDate.toLocaleDateString()} - ${mergedEvent.endDate.toLocaleDateString()}`} />
            <DetailRow label="Funding deadline" value={mergedEvent.deadline.toLocaleDateString()} />
            <DetailRow label="Location" value={mergedEvent.location} />
            <DetailRow label="Price per delegate" value={`₦${Number(mergedEvent.pricePerDelegate).toLocaleString()}`} />
            <DetailRow label="Delegates level" value={mergedEvent.delegatesLevel} />
            <DetailRow label="Category" value={mergedEvent.eventCategory} />
            <DetailRow label="Venue type" value={mergedEvent.venueType} />
            {mergedEvent.selectedTrainer && (
              <DetailRow
                label="Selected facilitator"
                value={
                  <Link href={`/facilitators/${mergedEvent.selectedTrainer.slug}`} style={{ color: "var(--primary)" }}>
                    {mergedEvent.selectedTrainer.firstName} {mergedEvent.selectedTrainer.lastName}
                  </Link>
                }
              />
            )}
          </div>

          {mergedEvent.coFacilitators.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <span style={{ color: "var(--t-muted)" }}>Co-facilitators: </span>
              {mergedEvent.coFacilitators.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  {c.facilitator.firstName} {c.facilitator.lastName}{" "}
                  <span
                    className={`tag ${c.status === "CONFIRMED" ? "t-active" : c.status === "DECLINED" ? "t-unavail" : "t-old"}`}
                    style={{ fontSize: 11 }}
                  >
                    {c.status === "CONFIRMED" ? "Confirmed" : c.status === "DECLINED" ? "Declined" : "Pending"}
                  </span>
                </span>
              ))}
            </div>
          )}

          {myCoFacilitatorInvite && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--t-muted)" }}>You&apos;ve been invited to co-facilitate this session.</span>
              <form
                action={async () => {
                  "use server";
                  await respondToCoFacilitatorInviteAction(myCoFacilitatorInvite.id, mergedEvent.slug, true);
                }}
              >
                <button type="submit" className="btn btn--primary">
                  Confirm
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await respondToCoFacilitatorInviteAction(myCoFacilitatorInvite.id, mergedEvent.slug, false);
                }}
              >
                <button type="submit" className="btn btn--secondary">
                  Decline
                </button>
              </form>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--t-light)", marginTop: 4 }}>
              {fundedSlots}/{mergedEvent.totalSlots} slots funded ({pct}%)
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            {canJoin && <JoinForm slug={mergedEvent.slug} remainingSlots={remainingSlots} />}

            {myParticipant && !myParticipant.hasPaid && (
              <PayShareForm slug={mergedEvent.slug} mergedTrainingEventId={mergedEvent.id} />
            )}

            <Link href={`/merged-trainings/${mergedEvent.slug}/applications`} className="btn btn--secondary">
              Bids ({mergedEvent._count.applications})
            </Link>

            {session.user.role === "FACILITATOR" && !mergedEvent.selectedTrainerId && (
              <Link href={`/merged-trainings/${mergedEvent.slug}/apply`} className="btn btn--primary">
                <Send />
                Apply to facilitate
              </Link>
            )}

            {isInitiator && !mergedEvent.paymentConfirmed && !mergedEvent.cancelled && (
              <>
                <Link href={`/merged-trainings/${mergedEvent.slug}/edit`} className="btn btn--secondary">
                  Edit
                </Link>
                <form action={cancelMergedTrainingAction}>
                  <input type="hidden" name="slug" value={mergedEvent.slug} />
                  <button type="submit" className="btn btn--danger">
                    Cancel
                  </button>
                </form>
              </>
            )}

            {isInitiator && mergedEvent.isFullyFunded && mergedEvent.selectedTrainerId && !mergedEvent.isCompleted && (
              <form action={completeMergedTrainingAction}>
                <input type="hidden" name="slug" value={mergedEvent.slug} />
                <input type="hidden" name="mergedTrainingEventId" value={mergedEvent.id} />
                <button type="submit" className="btn btn--primary">
                  Mark complete &amp; pay facilitator
                </button>
              </form>
            )}
          </div>

          {votingOpen && !mergedEvent.selectedTrainerId && mergedEvent._count.applications > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--t-muted)", marginTop: 10 }}>
              The funding deadline has passed. Participants and invitees can now vote on bids.
            </p>
          )}
        </section>

        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Funding</span>
              <h2 className="card-title">Participants</h2>
            </div>
          </div>
          {mergedEvent.participants.length === 0 ? (
            <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No participants yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {mergedEvent.participants.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-soft)",
                    padding: "10px 0",
                    fontSize: 13,
                  }}
                >
                  <span>
                    {p.company.organization || `${p.company.firstName} ${p.company.lastName}`} · {p.numDelegates}{" "}
                    delegate{p.numDelegates === 1 ? "" : "s"}
                  </span>
                  <span className={`tag ${p.hasPaid ? "t-active" : "t-old"}`}>{p.hasPaid ? "Paid" : "Unpaid"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
