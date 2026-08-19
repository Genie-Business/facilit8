import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listAdmins } from "@/lib/services/admin-management.service";
import {
  updateAdminTierAction,
  deactivateAdminAction,
  reactivateAdminAction,
} from "@/lib/actions/admin-management.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminCreateForm } from "@/components/admin/admin-create-form";

export const metadata: Metadata = {
  title: "Admin Management",
  robots: { index: false, follow: false },
};

export default async function AdminManagementPage() {
  const session = await auth();
  // Second layer of defense behind the SUPER_ADMIN check inside every action on this page —
  // (admin)/admin/layout.tsx only gates on role === "ADMIN" (both tiers), so this page needs
  // its own tier check to hide from Support Admins, mirroring that layout's own pattern.
  if (session?.user.adminTier !== "SUPER_ADMIN") redirect("/admin");

  const admins = await listAdmins();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin management</h1>
        <p className="text-muted-foreground">
          Super Admins have full access, including billing/pricing and managing other admins. Support Admins get
          day-to-day tools only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create an admin</CardTitle>
          <CardDescription>
            The new admin sets their own password via Forgot Password after creation — none is generated here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All admins</CardTitle>
          <CardDescription>{admins.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = admin.id === session?.user.id;
                const otherTier = admin.adminTier === "SUPER_ADMIN" ? "SUPPORT_ADMIN" : "SUPER_ADMIN";

                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="font-medium">
                        {admin.firstName} {admin.lastName}
                        {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{admin.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.adminTier === "SUPER_ADMIN" ? "secondary" : "outline"}>
                        {admin.adminTier === "SUPER_ADMIN" ? "Super Admin" : "Support Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.deactivatedAt ? "outline" : "secondary"}>
                        {admin.deactivatedAt ? "Deactivated" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await updateAdminTierAction(admin.id, otherTier);
                          }}
                        >
                          <Button type="submit" size="sm" variant="outline">
                            Make {otherTier === "SUPER_ADMIN" ? "Super" : "Support"}
                          </Button>
                        </form>
                        {admin.deactivatedAt ? (
                          <form
                            action={async () => {
                              "use server";
                              await reactivateAdminAction(admin.id);
                            }}
                          >
                            <Button type="submit" size="sm" variant="outline">
                              Reactivate
                            </Button>
                          </form>
                        ) : (
                          <form
                            action={async () => {
                              "use server";
                              await deactivateAdminAction(admin.id);
                            }}
                          >
                            <Button type="submit" size="sm" variant="destructive">
                              Deactivate
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
