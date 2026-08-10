import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, MapPin, Briefcase } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div style={{ color: "var(--t-muted)" }}>{label}</div>
      <div style={{ color: "var(--t-base)" }}>{value}</div>
    </>
  );
}

const ROLE_LABEL: Record<string, string> = {
  EVENT_MANAGER: "Event Manager",
  FACILITATOR: "Facilitator",
  PROFESSIONAL: "Professional",
  ADMIN: "Admin",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      facilitatorSkills: { include: { skill: true } },
      organizationMemberships: {
        where: { status: "APPROVED" },
        include: { organization: { select: { name: true, slug: true } } },
      },
    },
  });
  if (!user) return null;

  const membership = user.organizationMemberships[0];

  return (
    <>
      <section className="hero">
        <div className="hero-text" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {user.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImageUrl}
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
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
          )}
          <div>
            <span className="eyebrow">Account</span>
            <h1 className="hero-title">
              {user.firstName} {user.lastName}
            </h1>
            <p className="hero-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Briefcase style={{ width: 13, height: 13 }} />
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              {user.state && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  {user.state}
                  {user.localGovt ? `, ${user.localGovt}` : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <Link href="/profile/edit" className="btn btn--primary">
            <Pencil />
            Edit profile
          </Link>
        </div>
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
            {user.role === "EVENT_MANAGER" && user.organization && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Organization:</span> {user.organization}
              </p>
            )}
            {membership && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Affiliated with:</span> {membership.organization.name}
              </p>
            )}
            {user.role === "FACILITATOR" && (
              <>
                {user.specialization && (
                  <p>
                    <span style={{ color: "var(--t-muted)" }}>Specialization:</span> {user.specialization}
                  </p>
                )}
                {user.qualification && (
                  <p>
                    <span style={{ color: "var(--t-muted)" }}>Qualification:</span> {user.qualification}
                  </p>
                )}
                {user.experience && (
                  <p>
                    <span style={{ color: "var(--t-muted)" }}>Experience:</span> {user.experience}
                  </p>
                )}
                <p>
                  <span style={{ color: "var(--t-muted)" }}>Willing to travel:</span> {user.travel ? "Yes" : "No"}
                </p>
              </>
            )}
            {user.address && (
              <p>
                <span style={{ color: "var(--t-muted)" }}>Address:</span> {user.address}
              </p>
            )}
            {user.profileDescription && (
              <p style={{ paddingTop: 4, color: "var(--t-muted)", lineHeight: 1.6 }}>{user.profileDescription}</p>
            )}
            {!user.profileDescription &&
              !user.specialization &&
              !user.qualification &&
              !user.experience &&
              !user.organization &&
              !membership &&
              !user.address &&
              user.role !== "FACILITATOR" && (
                <p style={{ color: "var(--t-light)" }}>You haven&apos;t added any profile details yet.</p>
              )}
            {user.role === "FACILITATOR" && user.facilitatorSkills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                {user.facilitatorSkills.map(({ skill }) => (
                  <span key={skill.id} className="badge primary">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
            {user.role === "FACILITATOR" && (user.cvUrl || user.certificateUrl) && (
              <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
                {user.cvUrl && (
                  <a href={user.cvUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                    View CV
                  </a>
                )}
                {user.certificateUrl && (
                  <a href={user.certificateUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                    View certificate
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="col-6 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">Account</span>
              <h2 className="card-title">Account details</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Phone" value={user.mobilePhone} />
            <DetailRow label="Role" value={ROLE_LABEL[user.role] ?? user.role} />
            <DetailRow label="Identity verification" value={user.kycVerified ? "Verified" : "Not verified"} />
          </div>
          <p style={{ fontSize: 12, color: "var(--t-light)", marginTop: 12 }}>
            Email, phone, and legal name are tied to your verified identity and can&apos;t be changed here. Contact
            support if any of these are incorrect.
          </p>
        </section>
      </div>
    </>
  );
}
