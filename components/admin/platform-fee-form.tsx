"use client";

import { useActionState } from "react";

import { setPlatformFeeAction } from "@/lib/actions/admin-fee.actions";
import type { ActionState } from "@/lib/actions/shared";
import type { PlatformFeeScope } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function PlatformFeeForm({ scope, currentPercentage }: { scope: PlatformFeeScope; currentPercentage: number }) {
  const [state, formAction, pending] = useActionState(setPlatformFeeAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="scope" value={scope} />
      <div className="space-y-2">
        <Label htmlFor={`percentage-${scope}`}>Percentage</Label>
        <Input
          id={`percentage-${scope}`}
          name="percentage"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={currentPercentage}
          className="w-28"
          required
        />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving..." : "Save"}
      </Button>
      {state.error && (
        <Alert variant="destructive" className="py-1">
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
      )}
      {state.fieldErrors?.percentage && (
        <p className="text-sm text-destructive">{state.fieldErrors.percentage}</p>
      )}
      {state.success && <p className="text-sm text-muted-foreground">{state.success}</p>}
    </form>
  );
}
