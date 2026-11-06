"use client";

import { useActionState, useState } from "react";

import { withdrawAction } from "@/lib/actions/wallet.actions";
import type { ActionState } from "@/lib/actions/shared";
import { calculateCappedFee, roundKobo } from "@/lib/services/payout-math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

export function WithdrawForm({
  bankLabel,
  feeSchedule,
}: {
  bankLabel: string;
  /** The active withdrawal fee: a percentage, capped at maxAmount naira (null = no cap). */
  feeSchedule: { percentage: number; maxAmount: number | null };
}) {
  const [state, formAction, pending] = useActionState(withdrawAction, initialState);
  const [amountText, setAmountText] = useState("");

  // Same function the server charges with, so the preview can't drift from the real fee.
  const entered = roundKobo(Number(amountText));
  const hasAmount = Number.isFinite(entered) && entered > 0;
  const fee = hasAmount ? calculateCappedFee(entered, feeSchedule.percentage, feeSchedule.maxAmount) : 0;
  const receive = roundKobo(entered - fee);
  const chargesFee = feeSchedule.percentage > 0;

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
        <Input
          id="amount"
          name="amount"
          type="number"
          min={0}
          step="0.01"
          required
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
        />
        {state.fieldErrors?.amount && <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>}
        {chargesFee && (
          <div className="space-y-1 text-sm text-muted-foreground" aria-live="polite">
            <p>
              Withdrawal fee: {feeSchedule.percentage}%
              {feeSchedule.maxAmount !== null ? `, never more than ${naira(feeSchedule.maxAmount)}` : ""}. It&apos;s taken
              once your bank confirms the transfer.
            </p>
            {hasAmount &&
              (receive > 0 ? (
                <p className="text-foreground">
                  Fee {naira(fee)} · you&apos;ll receive {naira(receive)} at your bank.
                </p>
              ) : (
                <p className="text-destructive">That&apos;s too small to cover the fee. Try a larger amount.</p>
              ))}
          </div>
        )}
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
