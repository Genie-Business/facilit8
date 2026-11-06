"use client";

import { useActionState } from "react";

import { setChatFeeAction } from "@/lib/actions/admin-fee.actions";
import type { ActionState } from "@/lib/actions/shared";
import { CHAT_FEE_MAX } from "@/lib/validation/chat-fee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function ChatFeeForm({ currentAmount }: { currentAmount: number }) {
  const [state, formAction, pending] = useActionState(setChatFeeAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="chat-fee-amount">Fee (₦)</Label>
        <Input
          id="chat-fee-amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={CHAT_FEE_MAX}
          step={1}
          defaultValue={currentAmount}
          className="w-36"
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
      {state.fieldErrors?.amount && <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>}
      {state.success && <p className="text-sm text-muted-foreground">{state.success}</p>}
    </form>
  );
}
