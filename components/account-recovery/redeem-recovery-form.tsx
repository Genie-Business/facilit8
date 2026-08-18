"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";

import { redeemAccountRecoveryAction } from "@/lib/actions/account-recovery.actions";
import { resolveAccountNameAction } from "@/lib/actions/bank.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function RedeemRecoveryForm({
  token,
  banks,
}: {
  token: string;
  banks: { code: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(redeemAccountRecoveryAction, initialState);
  const [accountName, setAccountName] = useState("");
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
        <Button render={<Link href="/login" />} nativeButton={false} className="w-full">
          Go to sign in
        </Button>
      </div>
    );
  }

  function handleAccountNumberBlur(bankCode: string, accountNumber: string) {
    setResolveMessage(null);
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;

    startResolve(async () => {
      const result = await resolveAccountNameAction(bankCode, accountNumber);
      if (result.accountName) {
        setAccountName(result.accountName);
        setResolveMessage(null);
      } else {
        setResolveMessage(result.error ?? "Enter the account name manually.");
      }
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="recover-bankCode">Bank</Label>
        <select id="recover-bankCode" name="bankCode" defaultValue="" required className={nativeSelectClassName}>
          <option value="" disabled>
            Select your bank
          </option>
          {banks.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.bankCode && <p className="text-sm text-destructive">{state.fieldErrors.bankCode}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="recover-accountNumber">Account number</Label>
        <Input
          id="recover-accountNumber"
          name="accountNumber"
          inputMode="numeric"
          maxLength={10}
          required
          onBlur={(e) => {
            const bankCode = (document.getElementById("recover-bankCode") as HTMLSelectElement | null)?.value ?? "";
            handleAccountNumberBlur(bankCode, e.target.value);
          }}
        />
        {state.fieldErrors?.accountNumber && (
          <p className="text-sm text-destructive">{state.fieldErrors.accountNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="recover-accountName">Account name</Label>
        <Input
          id="recover-accountName"
          name="accountName"
          required
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder={resolving ? "Resolving..." : undefined}
        />
        {resolveMessage && <p className="text-xs text-muted-foreground">{resolveMessage}</p>}
        {state.fieldErrors?.accountName && (
          <p className="text-sm text-destructive">{state.fieldErrors.accountName}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Setting up your wallet..." : "Confirm and set up my wallet"}
      </Button>
    </form>
  );
}
