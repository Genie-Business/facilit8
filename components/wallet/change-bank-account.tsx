"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";

import { LinkBankAccountForm } from "@/components/wallet/link-bank-account-form";
import { Button } from "@/components/ui/button";

export function ChangeBankAccount({
  banks,
  currentLabel,
}: {
  banks: { code: string; name: string }[];
  currentLabel: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Landmark aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Withdraw to</p>
            <p className="truncate font-medium">{currentLabel}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">Link a different account</p>
      <LinkBankAccountForm banks={banks} onSuccess={() => setEditing(false)} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}
