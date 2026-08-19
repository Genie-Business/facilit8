import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { getUserOrganizationMembership, listOrganizationMembers } from "@/lib/services/organization.service";
import { updateMemberRoleAction } from "@/lib/actions/organization.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Team Members",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", MEMBER: "Member" };
const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  APPROVED: "secondary",
  PENDING: "outline",
  REJECTED: "destructive",
};

export default async function OrganizationMembersPage() {
  const session = await auth();
  if (!session) return null;

  const ownMembership = await getUserOrganizationMembership(session.user.id);

  if (!ownMembership || ownMembership.status !== "APPROVED") {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold">Team members</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t belong to an approved organization yet.
        </p>
      </div>
    );
  }

  const isOwner = ownMembership.role === "OWNER";
  const members = await listOrganizationMembers(ownMembership.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team members</h1>
        <p className="text-muted-foreground">{ownMembership.organization.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const canChangeRole = isOwner && member.role !== "OWNER" && member.status === "APPROVED";
                const otherRole = member.role === "MANAGER" ? "MEMBER" : "MANAGER";

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium">
                        {member.user.firstName} {member.user.lastName}
                        {member.userId === session.user.id && (
                          <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "OWNER" ? "secondary" : "outline"}>
                        {ROLE_LABEL[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[member.status]}>{member.status}</Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        {canChangeRole && (
                          <form
                            action={async () => {
                              "use server";
                              await updateMemberRoleAction(ownMembership.organizationId, member.id, otherRole);
                            }}
                          >
                            <Button type="submit" size="sm" variant="outline">
                              Make {otherRole === "MANAGER" ? "Manager" : "Member"}
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    )}
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
