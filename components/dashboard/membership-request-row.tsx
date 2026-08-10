"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { respondToMembershipRequestAction } from "@/lib/actions/organization.actions";
import { Button } from "@/components/ui/button";

export function MembershipRequestRow({
  membershipId,
  name,
  organizationName,
}: {
  membershipId: string;
  name: string;
  organizationName: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond(approve: boolean) {
    startTransition(async () => {
      await respondToMembershipRequestAction(membershipId, approve);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <p>
        <span className="font-medium">{name}</span>{" "}
        <span className="text-muted-foreground">wants to join {organizationName}</span>
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(false)}>
          Decline
        </Button>
        <Button size="sm" disabled={pending} onClick={() => respond(true)}>
          Approve
        </Button>
      </div>
    </div>
  );
}
