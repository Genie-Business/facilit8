import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Second layer of defense behind middleware.ts, per plan §7.
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <div className="space-y-6">{children}</div>;
}
