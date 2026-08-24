"use client";

import { useActionState } from "react";

import { linkAnchorCustomerAction, syncWalletAction } from "@/lib/actions/admin-account-recovery.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function LinkAnchorCustomerForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(linkAnchorCustomerAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-1">
        <Label htmlFor={`anchorCustomerId-${userId}`} className="text-xs">
          Existing Anchor customer ID
        </Label>
        <Input id={`anchorCustomerId-${userId}`} name="anchorCustomerId" placeholder="e.g. 176...-anc_ind_cst" className="w-64" />
        {state.fieldErrors?.anchorCustomerId && (
          <p className="text-xs text-destructive">{state.fieldErrors.anchorCustomerId}</p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Linking..." : "Link"}
      </Button>
      {state.error && (
        <Alert variant="destructive" className="py-1">
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && <p className="text-xs text-muted-foreground">{state.success}</p>}
    </form>
  );
}

export function SyncWalletForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(syncWalletAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Syncing..." : "Sync wallet from Anchor"}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.success && <p className="text-xs text-muted-foreground">{state.success}</p>}
    </form>
  );
}
