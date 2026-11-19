"use client";

import { useActionState } from "react";

import { resyncWalletAction } from "@/lib/actions/admin-account-recovery.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};

export function ResyncWalletForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(resyncWalletAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Re-running..." : "Re-run wallet setup"}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.success && <p className="text-xs text-muted-foreground">{state.success}</p>}
    </form>
  );
}
