import Link from "next/link";
import { Star, MessageCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startConversationAction } from "@/lib/actions/chat.actions";

export default async function FacilitatorsPage() {
  const session = await auth();
  const canChat = session?.user.role === "EVENT_MANAGER";

  const facilitators = await prisma.user.findMany({
    where: { role: "FACILITATOR" },
    orderBy: { createdAt: "desc" },
    take: 48,
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      specialization: true,
      state: true,
      profileImageUrl: true,
      facilitatorSkills: { include: { skill: true }, take: 3 },
    },
  });

  const ratings = await prisma.review.groupBy({
    by: ["revieweeId"],
    where: { revieweeId: { in: facilitators.map((f) => f.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingByUserId = new Map(ratings.map((r) => [r.revieweeId, r]));

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Training Ecosystem</span>
          <h1 className="hero-title">Facilitators</h1>
          <p className="hero-sub">
            {facilitators.length} vetted facilitator{facilitators.length === 1 ? "" : "s"} ready to run your next
            training.
          </p>
        </div>
      </section>

      {facilitators.length === 0 ? (
        <div className="card col-12">
          <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No facilitators yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {facilitators.map((facilitator) => {
            const rating = ratingByUserId.get(facilitator.id);
            return (
              <div key={facilitator.id} className="card" style={{ gap: 16 }}>
              <Link
                href={`/facilitators/${facilitator.slug}`}
                style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {facilitator.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={facilitator.profileImageUrl}
                      alt=""
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "1px solid var(--border)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 18,
                        background: "linear-gradient(135deg, var(--primary), var(--purple))",
                      }}
                    >
                      {facilitator.firstName[0]}
                      {facilitator.lastName[0]}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--t-base)" }}>
                      {facilitator.firstName} {facilitator.lastName}
                    </div>
                    {facilitator.specialization && (
                      <div style={{ fontSize: 12.5, color: "var(--t-muted)" }}>{facilitator.specialization}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                  {rating && rating._count.rating > 0 ? (
                    <>
                      <Star style={{ width: 14, height: 14, fill: "var(--warning)", color: "var(--warning)" }} />
                      <strong style={{ color: "var(--t-base)" }}>{rating._avg.rating?.toFixed(1)}</strong>
                      <span style={{ color: "var(--t-light)" }}>
                        ({rating._count.rating} review{rating._count.rating === 1 ? "" : "s"})
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--t-light)" }}>No reviews yet</span>
                  )}
                  {facilitator.state && (
                    <>
                      <span style={{ color: "var(--border)" }}>·</span>
                      <span style={{ color: "var(--t-light)" }}>{facilitator.state}</span>
                    </>
                  )}
                </div>

                {facilitator.facilitatorSkills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {facilitator.facilitatorSkills.map(({ skill }) => (
                      <span key={skill.id} className="badge primary">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              {canChat && (
                <form
                  action={startConversationAction}
                  style={{ paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}
                >
                  <input type="hidden" name="facilitatorSlug" value={facilitator.slug} />
                  <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                    <MessageCircle />
                    Chat
                  </button>
                </form>
              )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
