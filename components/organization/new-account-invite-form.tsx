"use client";

import { useActionState } from "react";

import { redeemOrgInviteNewAccountAction } from "@/lib/actions/organization-invite.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function NewAccountInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(redeemOrgInviteNewAccountAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-2">
          <Label htmlFor="invite-firstName">First name</Label>
          <Input id="invite-firstName" name="firstName" required />
          {state.fieldErrors?.firstName && <p className="text-sm text-destructive">{state.fieldErrors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-lastName">Last name</Label>
          <Input id="invite-lastName" name="lastName" required />
          {state.fieldErrors?.lastName && <p className="text-sm text-destructive">{state.fieldErrors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-mobilePhone">Phone number</Label>
        <Input id="invite-mobilePhone" name="mobilePhone" required />
        {state.fieldErrors?.mobilePhone && <p className="text-sm text-destructive">{state.fieldErrors.mobilePhone}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-password">Password</Label>
        <Input id="invite-password" name="password" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account and join"}
      </Button>
    </form>
  );
}
