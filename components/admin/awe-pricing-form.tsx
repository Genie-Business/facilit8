"use client";

import { useActionState, useState } from "react";

import { updateAwePricingAction } from "@/lib/actions/admin-awe-pricing.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function AwePricingForm({
  monthlyPrice,
  durationDays,
  isFree,
}: {
  monthlyPrice: number;
  durationDays: number;
  isFree: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateAwePricingAction, initialState);
  const [free, setFree] = useState(isFree);

  return (
    <form action={formAction} className="space-y-4">
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isFree"
          defaultChecked={isFree}
          onChange={(e) => setFree(e.target.checked)}
          className="size-4 rounded border-input"
        />
        Make Awe free for everyone (skip billing entirely)
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, opacity: free ? 0.5 : 1 }}>
        <div className="space-y-2">
          <Label htmlFor="monthlyPrice">Monthly price (₦)</Label>
          <Input
            id="monthlyPrice"
            name="monthlyPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={monthlyPrice}
            required
          />
          {state.fieldErrors?.monthlyPrice && (
            <p className="text-sm text-destructive">{state.fieldErrors.monthlyPrice}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationDays">Billing cycle (days)</Label>
          <Input
            id="durationDays"
            name="durationDays"
            type="number"
            min={1}
            defaultValue={durationDays}
            required
          />
          {state.fieldErrors?.durationDays && (
            <p className="text-sm text-destructive">{state.fieldErrors.durationDays}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save pricing"}
      </Button>
    </form>
  );
}
