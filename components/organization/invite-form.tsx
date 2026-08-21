"use client";

import { useActionState, useEffect, useRef } from "react";

import { sendOrgInviteAction } from "@/lib/actions/organization-invite.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function InviteForm({ organizationId }: { organizationId: string }) {
  const boundAction = sendOrgInviteAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="min-w-48 flex-1">
        <Input name="email" type="email" placeholder="teammate@example.com" required />
        {state.fieldErrors?.email && <p className="mt-1 text-sm text-destructive">{state.fieldErrors.email}</p>}
      </div>
      <select name="role" defaultValue="MEMBER" className={`${nativeSelectClassName} w-32`}>
        <option value="MEMBER">Member</option>
        <option value="MANAGER">Manager</option>
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send invite"}
      </Button>
      {state.error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert className="w-full">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
