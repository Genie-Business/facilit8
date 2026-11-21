"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleCheck } from "lucide-react";

import { withdrawAction } from "@/lib/actions/wallet.actions";
import type { ActionState } from "@/lib/actions/shared";
import { maxWithdrawable, quoteWithdrawal, type WithdrawalFeeSchedule } from "@/lib/wallet/withdrawal-quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

function SummaryRow({ label, value, strong = false, danger = false }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "border-t border-border pt-2 font-semibold" : ""}`}>
      <dt className={danger ? "text-destructive" : strong ? "text-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd className={`tabular-nums ${danger ? "text-destructive" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

export function WithdrawForm({
  feeSchedule,
  balance,
}: {
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
  const tooSmall = hasAmount && quoted?.ok === false;
  const maximum = maxWithdrawable(balance, feeSchedule);

  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert className="flex items-start gap-3 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <AlertDescription className="text-current">{state.success}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/wallet" />} nativeButton={false}>
            Back to wallet
          </Button>
          <Button variant="outline" render={<Link href="/wallet/transactions" />} nativeButton={false}>
            Transaction history
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">Amount to receive</Label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-medium text-muted-foreground">
            ₦
          </span>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            autoComplete="off"
            required
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            aria-invalid={overBalance || tooSmall || undefined}
            aria-describedby="amount-help"
            className="pl-8 text-lg font-medium tabular-nums [appearance:textfield] md:text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div id="amount-help" className="flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted-foreground">
          <span>Available: {naira(balance)}</span>
          {maximum > 0 ? (
            <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => setAmountText(String(maximum))}>
              Use the most I can withdraw ({naira(maximum)})
            </Button>
          ) : (
            <span>Not enough for a withdrawal once fees are added.</span>
          )}
        </div>
        {state.fieldErrors?.amount && <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>}
        {tooSmall && <p className="text-sm text-destructive">The smallest withdrawal is ₦100.</p>}
      </div>

      <div aria-live="polite" className="rounded-xl bg-muted/70 p-4 text-sm">
        {quoted?.ok ? (
          <dl className="space-y-2">
            <SummaryRow label="You'll receive at your bank" value={naira(quoted.quote.receive)} />
            <SummaryRow label="Bank transfer fee" value={naira(quoted.quote.transferFee)} />
            {quoted.quote.facilit8Fee > 0 && <SummaryRow label="Facilit8 fee" value={naira(quoted.quote.facilit8Fee)} />}
            <SummaryRow label="Total from your wallet" value={naira(quoted.quote.debit)} strong danger={overBalance} />
            {overBalance && <p className="pt-1 text-destructive">That&apos;s more than your balance of {naira(balance)}.</p>}
          </dl>
        ) : (
          <p className="text-muted-foreground">Enter an amount to see the fees and the total taken from your wallet.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Fees are only charged if the transfer goes through. If it fails, the full amount returns to your wallet.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Confirm your password</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
        {state.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={overBalance || tooSmall}>
        {pending ? "Processing…" : quoted?.ok ? `Withdraw ${naira(quoted.quote.receive)}` : "Withdraw"}
      </Button>
    </form>
  );
}
