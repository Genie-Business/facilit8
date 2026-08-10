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
  Tags,
  LayoutGrid,
  BadgeCheck,
  LifeBuoy,
  HelpCircle,
  UserCircle,
} from "lucide-react";

import { useShell } from "./shell-root";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
  external?: boolean;
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

const COMMUNICATIONS_LINKS: NavItem[] = [{ href: "/chat", label: "Chat", icon: MessageCircle }];

const ACCOUNT_LINKS: NavItem[] = [
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings/kyc", label: "Verify Identity", icon: ShieldCheck },
];

const MISC_LINKS: NavItem[] = [
  { href: "https://tawk.to/chat/68e6bf047d2af41952a74645/1j72lkb85", label: "Support", icon: LifeBuoy, external: true },
  { href: "/faq", label: "FAQs", icon: HelpCircle },
];

const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "Admin Home", icon: LayoutGrid },
  { href: "/admin/skills", label: "Skills", icon: Tags },
];

function NavLink({ href, label, icon: Icon, external }: NavItem) {
  const pathname = usePathname();
  const { closeDrawer } = useShell();
  const active = !external && (pathname === href || pathname.startsWith(`${href}/`));

  if (external) {
    return (
      <a href={href} className="nav-link" target="_blank" rel="noopener noreferrer">
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

export function SidebarNav({ role }: { role?: string }) {
  const accountLinks =
    role === "EVENT_MANAGER"
      ? [...ACCOUNT_LINKS, { href: "/organization/verify", label: "Verify Business", icon: BadgeCheck }]
      : ACCOUNT_LINKS;

  return (
    <>
      <NavSection label="Workspace" links={WORKSPACE_LINKS} />
      <NavSection label="Training Ecosystem" links={TRAINING_ECOSYSTEM_LINKS} />
      <NavSection label="Event Management" links={EVENT_MANAGEMENT_LINKS} />
      <NavSection label="Communications" links={COMMUNICATIONS_LINKS} />
      <NavSection label="Account" links={accountLinks} />
      <NavSection label="Misc" links={MISC_LINKS} />
      {role === "ADMIN" && <NavSection label="Admin" links={ADMIN_LINKS} />}
    </>
  );
}
