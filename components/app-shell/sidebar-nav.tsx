"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gavel,
  CalendarRange,
  FolderKanban,
  Users,
  CalendarDays,
  Handshake,
  MessageCircle,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Tags,
  LayoutGrid,
  BadgeCheck,
  LifeBuoy,
  HelpCircle,
  UserCircle,
  Sparkles,
  FileText,
  Activity,
  Repeat,
  History,
  UserCog,
  ArrowLeftRight,
} from "lucide-react";

import { useShell } from "./shell-root";
import { siteUrl, appUrl } from "@/lib/site";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
  external?: boolean; // opens in a new tab (genuinely external services)
  crossDomain?: boolean; // same-tab plain <a> to the apex host (the app shell now lives on a subdomain)
}

const WORKSPACE_LINKS: NavItem[] = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const TRAINING_ECOSYSTEM_LINKS: NavItem[] = [
  { href: "/applications", label: "Bid", icon: Gavel },
  { href: "/events", label: "Browse Events", icon: CalendarRange },
  { href: "/my-events", label: "My Events", icon: FolderKanban },
  { href: "/facilitators", label: "Access Facilitators", icon: Users },
  { href: "/merged-trainings", label: "Merger Trainings", icon: Handshake },
];

const EVENT_MANAGEMENT_LINKS: NavItem[] = [{ href: "/calendar", label: "Calendar", icon: CalendarDays }];

const COMMUNICATIONS_LINKS: NavItem[] = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/awe", label: "Awé", icon: Sparkles },
];

const ACCOUNT_LINKS: NavItem[] = [
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/profile/background", label: "Career Background", icon: History },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings/kyc", label: "Verify Identity", icon: ShieldCheck },
];

const MISC_LINKS: NavItem[] = [
  { href: "https://tawk.to/chat/68e6bf047d2af41952a74645/1j72lkb85", label: "Support", icon: LifeBuoy, external: true },
  { href: `${siteUrl}/faq`, label: "FAQs", icon: HelpCircle, crossDomain: true },
];

// Base admin pages, as relative (same-host) paths — used directly when the sidebar itself
// renders inside the (admin) shell (already on the apex host, per proxy.ts's ADMIN_PREFIX
// gating). When rendered from within the (app) shell instead, these are re-prefixed with
// siteUrl + crossDomain (see ADMIN_LINKS_APP below) since (app) now lives on the app
// subdomain and admin lives on the apex.
const ADMIN_BASE_LINKS: (Omit<NavItem, "crossDomain"> & { superAdminOnly?: boolean })[] = [
  { href: "/admin", label: "Admin Home", icon: LayoutGrid },
  { href: "/admin/account-recovery", label: "Account Recovery", icon: LifeBuoy },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/skills", label: "Skills", icon: Tags },
  { href: "/admin/awe-subscriptions", label: "Awé Subscriptions", icon: Repeat, superAdminOnly: true },
  { href: "/admin/awe-pricing", label: "Awé Pricing", icon: Sparkles, superAdminOnly: true },
  { href: "/admin/admins", label: "Admin Management", icon: UserCog, superAdminOnly: true },
];

function adminLinksFor(adminTier: string | null | undefined, crossDomain: boolean): NavItem[] {
  return ADMIN_BASE_LINKS.filter((link) => !link.superAdminOnly || adminTier === "SUPER_ADMIN").map((link) => ({
    ...link,
    href: crossDomain ? `${siteUrl}${link.href}` : link.href,
    crossDomain,
  }));
}

function NavLink({ href, label, icon: Icon, external, crossDomain }: NavItem) {
  const pathname = usePathname();
  const { closeDrawer } = useShell();
  const isPlainAnchor = external || crossDomain;
  const active = !isPlainAnchor && (pathname === href || pathname.startsWith(`${href}/`));

  if (isPlainAnchor) {
    return (
      <a
        href={href}
        className="nav-link"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <Icon />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} className={`nav-link${active ? " is-active" : ""}`} onClick={closeDrawer}>
      <Icon />
      <span>{label}</span>
    </Link>
  );
}

function NavSection({ label, links }: { label: string; links: NavItem[] }) {
  return (
    <nav className="nav-section">
      <div className="nav-label">{label}</div>
      {links.map((link) => (
        <NavLink key={link.href} {...link} />
      ))}
    </nav>
  );
}

const BACK_TO_APP_LINKS: NavItem[] = [{ href: `${appUrl}/dashboard`, label: "Back to App", icon: ArrowLeftRight, crossDomain: true }];

export function SidebarNav({
  role,
  adminTier,
  variant = "app",
}: {
  role?: string;
  adminTier?: string | null;
  variant?: "app" | "admin";
}) {
  if (variant === "admin") {
    return (
      <>
        <NavSection label="Admin" links={adminLinksFor(adminTier, false)} />
        <NavSection label="Workspace" links={BACK_TO_APP_LINKS} />
      </>
    );
  }

  const accountLinks =
    role === "EVENT_MANAGER"
      ? [
          ...ACCOUNT_LINKS,
          { href: "/organization/verify", label: "Verify Business", icon: BadgeCheck },
          { href: "/organization/members", label: "Team Members", icon: Users },
        ]
      : ACCOUNT_LINKS;

  return (
    <>
      <NavSection label="Workspace" links={WORKSPACE_LINKS} />
      <NavSection label="Training Ecosystem" links={TRAINING_ECOSYSTEM_LINKS} />
      <NavSection label="Event Management" links={EVENT_MANAGEMENT_LINKS} />
      <NavSection label="Communications" links={COMMUNICATIONS_LINKS} />
      <NavSection label="Account" links={accountLinks} />
      <NavSection label="Misc" links={MISC_LINKS} />
      {role === "ADMIN" && <NavSection label="Admin" links={adminLinksFor(adminTier, true)} />}
    </>
  );
}
