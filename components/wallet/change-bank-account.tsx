"use client";

import { useState } from "react";

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
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">Linked account: {currentLabel}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Link a different account</p>
      <LinkBankAccountForm banks={banks} onSuccess={() => setEditing(false)} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}
