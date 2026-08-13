"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import { updateLinkedBankAccountAction } from "@/lib/actions/wallet.actions";
import { resolveAccountNameAction } from "@/lib/actions/bank.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function LinkBankAccountForm({
  banks,
  onSuccess,
}: {
  banks: { code: string; name: string }[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateLinkedBankAccountAction, initialState);
  const [accountName, setAccountName] = useState("");
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

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
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="link-bankCode">Bank</Label>
        <select id="link-bankCode" name="bankCode" defaultValue="" required className={nativeSelectClassName}>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="link-accountNumber">Account number</Label>
          <Input
            id="link-accountNumber"
            name="accountNumber"
            inputMode="numeric"
            maxLength={10}
            required
            onBlur={(e) => {
              const bankCode = (document.getElementById("link-bankCode") as HTMLSelectElement | null)?.value ?? "";
              handleAccountNumberBlur(bankCode, e.target.value);
            }}
          />
          {state.fieldErrors?.accountNumber && (
            <p className="text-sm text-destructive">{state.fieldErrors.accountNumber}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-accountName">Account name</Label>
          <Input
            id="link-accountName"
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
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save account"}
      </Button>
    </form>
  );
}
