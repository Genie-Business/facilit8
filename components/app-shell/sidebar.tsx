import Image from "next/image";
import Link from "next/link";

import { SidebarNav } from "./sidebar-nav";
import { siteUrl } from "@/lib/site";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export interface SidebarUser {
  name: string;
  role: string;
  profileImageUrl: string | null;
}

export function Sidebar({
  role,
  adminTier,
  variant = "app",
  adminCrossDomain = false,
  user,
}: {
  role?: string;
  adminTier?: string | null;
  variant?: "app" | "admin";
  adminCrossDomain?: boolean;
  user: SidebarUser;
}) {
  const brandHref = variant === "admin" ? (adminCrossDomain ? `${siteUrl}/admin` : "/admin") : "/dashboard";

  const brand = (
    <>
      <div className="brand-logo">
        <Image src="/brand/mark-white.png" alt="" width={18} height={18} />
      </div>
      <div className="brand-text">
        <div className="brand-name">Facilit8</div>
        <div className="brand-tag">{variant === "admin" ? "ADMIN" : "MARKETPLACE"}</div>
      </div>
    </>
  );

  return (
    <aside className="d-sidebar">
      {variant === "admin" && adminCrossDomain ? (
        <a href={brandHref} className="brand">
          {brand}
        </a>
      ) : (
        <Link href={brandHref} className="brand">
          {brand}
        </Link>
      )}

      <SidebarNav role={role} adminTier={adminTier} variant={variant} adminCrossDomain={adminCrossDomain} />

      <div className="sidebar-footer">
        <div className="workspace">
          {user.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImageUrl}
              alt=""
              className="workspace-avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="workspace-avatar">{initials(user.name)}</div>
          )}
          <div className="workspace-text">
            <div className="workspace-name">{user.name}</div>
            <div className="workspace-role">{user.role.replace(/_/g, " ").toLowerCase()}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
