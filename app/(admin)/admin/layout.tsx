import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Every admin page is auth-gated and reads live data — never worth attempting to
// prerender, and prerendering it means a build-time DB hiccup fails the whole deploy
// instead of just that request.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Second layer of defense behind proxy.ts, per plan §7. Absolute redirect since admin
  // lives on the apex domain but the dashboard now lives on the app subdomain.
  if (!session || session.user.role !== "ADMIN") {
    redirect(`${appUrl}/dashboard`);
  }

  return <div className="space-y-6">{children}</div>;
}
