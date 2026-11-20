"use client";

import { useActionState } from "react";

import { checkWalletAction } from "@/lib/actions/kyc.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};

/** Shown while verification is pending: asks Paystack straight away instead of waiting for its notification. */
export function CheckWalletForm() {
  const [state, formAction, pending] = useActionState(() => checkWalletAction(), initialState);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Checking..." : "Check again"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm text-muted-foreground">{state.success}</p>}
    </form>
  );
}
