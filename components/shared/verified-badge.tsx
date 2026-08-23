import { BadgeCheck } from "lucide-react";

/** Shown next to a facilitator/professional's name (User.kycVerified) or an organization's
 * name (Organization.verificationStatus === "VERIFIED"). Renders nothing when not verified —
 * callers can render unconditionally: <VerifiedBadge verified={x.kycVerified} />. */
export function VerifiedBadge({ verified, label = "Verified" }: { verified: boolean; label?: string }) {
  if (!verified) return null;

  return (
    <span className="tag t-active" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <BadgeCheck style={{ width: 11, height: 11 }} />
      {label}
    </span>
  );
}
