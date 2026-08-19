import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listActiveSkills } from "@/lib/services/skill.service";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { DeactivateAccountForm } from "@/components/profile/deactivate-account-form";

export const metadata: Metadata = {
  title: "Edit Profile",
  robots: { index: false, follow: false },
};

export default async function ProfileEditPage() {
  const session = await auth();
  if (!session) return null;

  const [user, skills] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { facilitatorSkills: { select: { skillId: true } } },
    }),
    session.user.role === "FACILITATOR" ? listActiveSkills() : Promise.resolve([]),
  ]);
  if (!user) return null;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Account</span>
          <h1 className="hero-title">Edit profile</h1>
          <p className="hero-sub">Update how you appear to others on Facilit8.</p>
        </div>
      </section>

      <div className="card" style={{ maxWidth: 640 }}>
        <ProfileEditForm
          user={user}
          skills={skills}
          selectedSkillIds={user.facilitatorSkills.map((fs) => fs.skillId)}
        />
      </div>

      <div className="card" style={{ maxWidth: 640, borderColor: "var(--destructive)" }}>
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <div className="mt-4">
          <DeactivateAccountForm />
        </div>
      </div>
    </>
  );
}
