"use client";

import { useActionState } from "react";
import Link from "next/link";

import { acceptOrgInviteAction } from "@/lib/actions/organization-invite.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptOrgInviteAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
        <Button render={<Link href="/organization/members" />} nativeButton={false} className="w-full">
          Go to Team Members
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Joining..." : "Accept and join"}
      </Button>
    </form>
  );
}
