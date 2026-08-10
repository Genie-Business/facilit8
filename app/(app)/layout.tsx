import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { ShellRoot } from "@/components/app-shell/shell-root";
import "./adminator.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) return <div className="min-h-screen bg-muted/30">{children}</div>;

  const [user, notifications, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true, profileImageUrl: true },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, slug: true, message: true, notificationType: true, link: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  const name = user ? `${user.firstName} ${user.lastName}` : (session.user.name ?? session.user.email ?? "");

  return (
    <ShellRoot>
      <Sidebar
        role={session.user.role}
        user={{ name, role: session.user.role, profileImageUrl: user?.profileImageUrl ?? null }}
      />
      <div className="main" style={{ minHeight: "100vh" }}>
        <Topbar
          userId={session.user.id}
          name={name}
          email={user?.email ?? session.user.email ?? ""}
          profileImageUrl={user?.profileImageUrl ?? null}
          notifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
          unreadCount={unreadCount}
        />
        <main className="content" style={{ flex: 1 }}>
          {children}
        </main>
        <footer className="d-footer">
          <div>© {new Date().getFullYear()} Facilit8</div>
          <div className="d-footer-meta">
            <span>Nigeria</span>
          </div>
        </footer>
      </div>
    </ShellRoot>
  );
}
