import { notFound } from "next/navigation";
import { Star, MapPin, MessageCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startConversationAction } from "@/lib/actions/chat.actions";
import { ReviewForm } from "@/components/reviews/review-form";

export default async function FacilitatorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const facilitator = await prisma.user.findUnique({
    where: { slug, role: "FACILITATOR" },
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      specialization: true,
      qualification: true,
      experience: true,
      profileDescription: true,
      profileImageUrl: true,
      state: true,
      facilitatorSkills: { include: { skill: true } },
    },
  });
  if (!facilitator) notFound();

  const reviews = await prisma.review.findMany({
    where: { revieweeId: facilitator.id },
    orderBy: { createdAt: "desc" },
    include: { reviewer: { select: { firstName: true, lastName: true, organization: true } } },
  });

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  let eligibleEvents: { id: string; title: string }[] = [];
  if (session?.user.role === "EVENT_MANAGER") {
    eligibleEvents = await prisma.trainingEvent.findMany({
      where: {
        companyId: session.user.id,
        selectedTrainerId: facilitator.id,
        reviews: { none: { reviewerId: session.user.id } },
      },
      select: { id: true, title: true },
    });
  }

  return (
    <>
      <section className="hero">
        <div className="hero-text" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {facilitator.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={facilitator.profileImageUrl}
              alt=""
              style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 600,
                fontSize: 24,
                background: "linear-gradient(135deg, var(--primary), var(--purple))",
              }}
            >
              {facilitator.firstName[0]}
              {facilitator.lastName[0]}
            </div>
          )}
          <div>
            <span className="eyebrow">Training Ecosystem</span>
            <h1 className="hero-title">
              {facilitator.firstName} {facilitator.lastName}
            </h1>
            <p className="hero-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {avgRating !== null ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Star style={{ width: 14, height: 14, fill: "var(--warning)", color: "var(--warning)" }} />
                  <strong style={{ color: "var(--t-base)" }}>{avgRating.toFixed(1)}</strong>({reviews.length} review
                  {reviews.length === 1 ? "" : "s"})
                </span>
              ) : (
                "No reviews yet"
              )}
              {facilitator.state && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  {facilitator.state}
                </span>
              )}
            </p>
          </div>
        </div>
        {session?.user.role === "EVENT_MANAGER" && (
          <div className="hero-actions">
            <form action={startConversationAction}>
              <input type="hidden" name="facilitatorSlug" value={facilitator.slug} />
              <button type="submit" className="btn btn--primary">
                <MessageCircle />
                Message
              </button>
            </form>
          </div>
        )}
      </section>

      <div className="grid">
        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">About</span>
              <h2 className="card-title">Profile</h2>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {facilitator.specialization && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Specialization:</span> {facilitator.specialization}
              </p>
            )}
            {facilitator.qualification && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Qualification:</span> {facilitator.qualification}
              </p>
            )}
            {facilitator.experience && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Experience:</span> {facilitator.experience}
              </p>
            )}
            {facilitator.profileDescription && (
              <p style={{ paddingTop: 4, color: "var(--t-muted)", lineHeight: 1.6 }}>
                {facilitator.profileDescription}
              </p>
            )}
            {facilitator.facilitatorSkills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                {facilitator.facilitatorSkills.map(({ skill }) => (
                  <span key={skill.id} className="badge primary">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {eligibleEvents.length > 0 && (
          <section className="col-6 card">
            <div className="card-head">
              <div className="card-title-wrap">
                <span className="eyebrow">Feedback</span>
                <h2 className="card-title">Leave a review</h2>
              </div>
            </div>
            <ReviewForm facilitatorSlug={facilitator.slug} eligibleEvents={eligibleEvents} />
          </section>
        )}

        <section className={eligibleEvents.length > 0 ? "col-12 card" : "col-6 card"}>
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Feedback</span>
              <h2 className="card-title">Reviews</h2>
            </div>
          </div>
          {reviews.length === 0 ? (
            <p style={{ color: "var(--t-muted)", fontSize: 13 }}>No reviews yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {reviews.map((review) => (
                <div key={review.id} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>{review.reviewer.organization || `${review.reviewer.firstName} ${review.reviewer.lastName}`}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      <Star style={{ width: 13, height: 13, fill: "var(--warning)", color: "var(--warning)" }} />
                      {review.rating}
                    </span>
                  </div>
                  {review.feedback && (
                    <p style={{ fontSize: 12.5, color: "var(--t-muted)", marginTop: 4 }}>{review.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
