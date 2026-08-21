import Link from "next/link";
import { Plus, MapPin, Calendar } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mergedTrainingProgress } from "@/lib/utils/merged-training-stages";
import { getApprovedOrganizationId } from "@/lib/services/organization.service";

export default async function MergedTrainingBoardPage() {
  const session = await auth();
  if (!session) return null;

  // Same visibility scoping as /events: TEAM_ONLY only narrows the general "posted to
  // board" pathway for outside Professionals/Event Managers — the initiator, participants,
  // and invitees (who may well be from other businesses, that's the whole point of merging)
  // can always see a session they're already part of, regardless of visibility.
  const seesEverything = session.user.role === "FACILITATOR" || session.user.role === "ADMIN";
  const ownOrgId = seesEverything ? null : await getApprovedOrganizationId(session.user.id);

  const sessions = await prisma.mergedTrainingEvent.findMany({
    where: {
      cancelled: false,
      OR: [
        {
          isPostedToBoard: true,
          ...(seesEverything
            ? {}
            : { OR: [{ visibility: "PUBLIC" as const }, ...(ownOrgId ? [{ organizationId: ownOrgId }] : [])] }),
        },
        { initiatorId: session.user.id },
        { participants: { some: { companyId: session.user.id } } },
        { invites: { some: { companyId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { participants: true, invites: true },
  });

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">Merger trainings</h1>
          <p className="hero-sub">
            {sessions.length} pooled training session{sessions.length === 1 ? "" : "s"} across the marketplace.
          </p>
        </div>
        {["EVENT_MANAGER", "PROFESSIONAL", "FACILITATOR"].includes(session.user.role) && (
          <div className="hero-actions">
            <Link href="/merged-trainings/new" className="btn btn--primary">
              <Plus />
              New session
            </Link>
          </div>
        )}
      </section>

      {sessions.length === 0 ? (
        <div className="card col-12">
          <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No merged training sessions yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {sessions.map((mergedEvent) => {
            const fundedSlots = mergedEvent.participants
              .filter((p) => p.hasPaid)
              .reduce((sum, p) => sum + p.numDelegates, 0);
            const pct = Math.min(100, Math.round((fundedSlots / mergedEvent.totalSlots) * 100));
            const progress = mergedTrainingProgress(mergedEvent);
            const currentStage = progress.stages[progress.currentIndex];

            return (
              <Link
                key={mergedEvent.id}
                href={`/merged-trainings/${mergedEvent.slug}`}
                className="card"
                style={{ textDecoration: "none", gap: 12 }}
              >
                <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--t-base)" }}>{mergedEvent.title}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--t-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin style={{ width: 13, height: 13 }} />
                    {mergedEvent.location}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar style={{ width: 13, height: 13 }} />
                    {mergedEvent.startDate.toLocaleDateString()} – {mergedEvent.endDate.toLocaleDateString()}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t-base)" }}>
                  ₦{Number(mergedEvent.pricePerDelegate).toLocaleString()} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--t-muted)" }}>/ delegate</span>
                </div>

                <div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--t-light)", marginTop: 4 }}>
                    {fundedSlots}/{mergedEvent.totalSlots} slots funded ({pct}%)
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span className="tag t-info">Stage: {currentStage.label}</span>
                  {mergedEvent.isInviteOnly && <span className="tag t-old">Invite-only</span>}
                  {mergedEvent.visibility === "TEAM_ONLY" && <span className="tag t-info">Team only</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
