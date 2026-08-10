"use client";

import { useActionState } from "react";

import { withdrawAction } from "@/lib/actions/wallet.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function WithdrawForm({ bankLabel }: { bankLabel: string }) {
  const [state, formAction, pending] = useActionState(withdrawAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">Withdrawing to {bankLabel}</p>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input id="amount" name="amount" type="number" min={0} step="0.01" required />
        {state.fieldErrors?.amount && <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Confirm your password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Processing..." : "Withdraw"}
      </Button>
    </form>
  );
}
