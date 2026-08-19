"use client";

import { useActionState } from "react";

import { deactivateAccountAction } from "@/lib/actions/account.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function DeactivateAccountForm() {
  const [state, formAction, pending] = useActionState(deactivateAccountAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        This deactivates your account and signs you out. Your data isn&apos;t deleted — it stays on file per CBN
        record-retention rules. You can reactivate any time by logging back in with the correct password.
      </p>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="deactivate-password">Confirm your password</Label>
        <Input
          id="deactivate-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        )}
      </div>

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deactivating..." : "Deactivate my account"}
      </Button>
    </form>
  );
}
