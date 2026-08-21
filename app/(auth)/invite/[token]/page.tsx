import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInviteForm } from "@/components/organization/accept-invite-form";
import { NewAccountInviteForm } from "@/components/organization/new-account-invite-form";
import { auth } from "@/lib/auth";
import { getOrgInviteByToken } from "@/lib/services/organization-invite.service";
import { checkInviteEmailHasAccount } from "@/lib/actions/organization-invite.actions";

export const metadata: Metadata = {
  title: "Accept Invite",
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getOrgInviteByToken(token);

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite link invalid</CardTitle>
          <CardDescription>This invite link is invalid or has expired. Ask the organization to send a new one.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const session = await auth();
  const hasAccount = await checkInviteEmailHasAccount(invite.email);

  if (hasAccount) {
    if (session && session.user.email === invite.email) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Join {invite.organization.name}?</CardTitle>
            <CardDescription>You&apos;ll be added as a {invite.role === "MANAGER" ? "manager" : "member"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <AcceptInviteForm token={token} />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Log in to accept this invite</CardTitle>
          <CardDescription>
            This invite was sent to {invite.email}. Log in with that account to join {invite.organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`} />} nativeButton={false}>
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {invite.organization.name}</CardTitle>
        <CardDescription>Set up your account to join as a {invite.role === "MANAGER" ? "manager" : "member"}.</CardDescription>
      </CardHeader>
      <CardContent>
        <NewAccountInviteForm token={token} email={invite.email} />
      </CardContent>
    </Card>
  );
}
