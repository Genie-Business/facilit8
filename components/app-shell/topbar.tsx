"use client";

import { usePathname } from "next/navigation";
import { Menu, Search, Sun, Moon } from "lucide-react";

import { useShell } from "./shell-root";
import { NotificationDropdown, type NotificationItem } from "@/components/notifications/notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";

// Group + label must match the sidebar's nav-section groupings exactly (see
// sidebar-nav.tsx) — this is what renders as the breadcrumb, and each page's hero eyebrow
// should echo the same group name for consistency.
const PAGE_META: Record<string, { group: string; label: string }> = {
  "/dashboard": { group: "Workspace", label: "Dashboard" },
  "/applications": { group: "Training Ecosystem", label: "Bid" },
  "/events": { group: "Training Ecosystem", label: "Browse Events" },
  "/my-events": { group: "Training Ecosystem", label: "My Events" },
  "/facilitators": { group: "Training Ecosystem", label: "Access Facilitators" },
  "/merged-trainings": { group: "Training Ecosystem", label: "Merger Trainings" },
  "/calendar": { group: "Event Management", label: "Calendar" },
  "/chat": { group: "Communications", label: "Chat" },
  "/awe": { group: "Communications", label: "Awé" },
  "/profile": { group: "Account", label: "My Profile" },
  "/wallet": { group: "Account", label: "Wallet" },
  "/settings/kyc": { group: "Account", label: "Verify Identity" },
  "/organization/verify": { group: "Account", label: "Verify Business" },
  "/notifications": { group: "Workspace", label: "Notifications" },
  "/search": { group: "Workspace", label: "Search" },
  "/admin": { group: "Admin", label: "Admin Home" },
  "/admin/skills": { group: "Admin", label: "Skills" },
  "/admin/awe-pricing": { group: "Admin", label: "Awé Pricing" },
  "/admin/content": { group: "Admin", label: "Content" },
  "/admin/activity": { group: "Admin", label: "Activity" },
  "/admin/awe-subscriptions": { group: "Admin", label: "Awé Subscriptions" },
};

function metaFor(pathname: string): { group: string; label: string } {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const matchedPrefix = Object.keys(PAGE_META)
    .filter((p) => pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return matchedPrefix ? PAGE_META[matchedPrefix] : { group: "Workspace", label: "Workspace" };
}

export function Topbar({
  userId,
  name,
  email,
  profileImageUrl,
  notifications,
  unreadCount,
}: {
  userId: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const { openDrawer, theme, toggleTheme } = useShell();
  const pathname = usePathname();
  const { group, label } = metaFor(pathname);

  return (
    <header className="d-topbar">
      <div className="crumbs">
        <button className="hamburger" aria-label="Open navigation" onClick={openDrawer}>
          <Menu />
        </button>
        <span>{group}</span>
        <svg className="sep" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="current">{label}</span>
      </div>

      <div className="topbar-actions">
        <form action="/search" className="cmd" style={{ display: "inline-flex" }}>
          <Search />
          <input
            name="q"
            placeholder="Search..."
            style={{ background: "transparent", border: 0, outline: "none", color: "inherit", font: "inherit", flex: 1 }}
          />
        </form>

        <NotificationDropdown userId={userId} initialNotifications={notifications} initialUnreadCount={unreadCount} />

        <button type="button" className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>

        <ProfileDropdown name={name} email={email} profileImageUrl={profileImageUrl} />
      </div>
    </header>
  );
}
