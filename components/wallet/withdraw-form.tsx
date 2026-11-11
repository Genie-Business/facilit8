"use client";

import { useActionState, useState } from "react";

import { withdrawAction } from "@/lib/actions/wallet.actions";
import type { ActionState } from "@/lib/actions/shared";
import { maxWithdrawable, quoteWithdrawal, type WithdrawalFeeSchedule } from "@/lib/wallet/withdrawal-quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

export function WithdrawForm({
  bankLabel,
  feeSchedule,
  balance,
}: {
  bankLabel: string;
  /** Facilit8's withdrawal fee: a percentage, capped at maxAmount naira (null = no cap). */
  feeSchedule: WithdrawalFeeSchedule;
  balance: number;
}) {
  const [state, formAction, pending] = useActionState(withdrawAction, initialState);
  const [amountText, setAmountText] = useState("");

  // The very functions the server charges with, so the figures shown can't differ from the real ones.
  const entered = Math.round(Number(amountText) * 100) / 100;
  const hasAmount = Number.isFinite(entered) && entered > 0;
  const quoted = hasAmount ? quoteWithdrawal(entered, feeSchedule) : null;
  const overBalance = quoted?.ok === true && quoted.quote.debit > balance;
  const maximum = maxWithdrawable(balance, feeSchedule);

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
        <Label htmlFor="amount">Amount to receive (₦)</Label>
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
        <p className="text-sm text-muted-foreground">
          Your balance: {naira(balance)}.{" "}
          {maximum > 0 ? (
            <button type="button" className="underline underline-offset-4" onClick={() => setAmountText(String(maximum))}>
              Most you can withdraw: {naira(maximum)}
            </button>
          ) : (
            "Not enough for a withdrawal once fees are added."
          )}
        </p>
        {state.fieldErrors?.amount && <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>}

        <div className="space-y-1 text-sm text-muted-foreground" aria-live="polite">
          {quoted?.ok && (
            <>
              <p className="text-foreground">You&apos;ll receive {naira(quoted.quote.receive)} at your bank.</p>
              <p>
                Fees on top: {naira(quoted.quote.transferFee)} bank transfer
                {quoted.quote.facilit8Fee > 0 ? ` + ${naira(quoted.quote.facilit8Fee)} Facilit8` : ""}.
              </p>
              <p className={overBalance ? "text-destructive" : "text-foreground"}>
                Total from your wallet: {naira(quoted.quote.debit)}
                {overBalance ? ` — more than your balance of ${naira(balance)}.` : "."}
              </p>
            </>
          )}
          {hasAmount && quoted && !quoted.ok && <p className="text-destructive">The smallest withdrawal is ₦100.</p>}
          <p>Fees are only charged if the transfer goes through. If it fails, the full amount returns to your wallet.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Confirm your password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password}</p>}
      </div>

      <Button type="submit" disabled={pending || overBalance || (hasAmount && quoted?.ok === false)}>
        {pending ? "Processing..." : "Withdraw"}
      </Button>
    </form>
  );
}
