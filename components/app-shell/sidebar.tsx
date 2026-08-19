import Image from "next/image";
import Link from "next/link";

import { SidebarNav } from "./sidebar-nav";

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
  user,
}: {
  role?: string;
  adminTier?: string | null;
  variant?: "app" | "admin";
  user: SidebarUser;
}) {
  return (
    <aside className="d-sidebar">
      <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="brand">
        <div className="brand-logo">
          <Image src="/brand/mark-white.png" alt="" width={18} height={18} />
        </div>
        <div className="brand-text">
          <div className="brand-name">Facilit8</div>
          <div className="brand-tag">{variant === "admin" ? "ADMIN" : "MARKETPLACE"}</div>
        </div>
      </Link>

      <SidebarNav role={role} adminTier={adminTier} variant={variant} />

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
