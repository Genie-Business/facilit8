"use client";

import { useActionState } from "react";

import { submitKycAction } from "@/lib/actions/kyc.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};
const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function KycForm() {
  const [state, formAction, pending] = useActionState(submitKycAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="bvn">BVN</Label>
        <Input id="bvn" name="bvn" inputMode="numeric" maxLength={11} required />
        {state.fieldErrors?.bvn && <p className="text-sm text-destructive">{state.fieldErrors.bvn}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
        {state.fieldErrors?.dateOfBirth && (
          <p className="text-sm text-destructive">{state.fieldErrors.dateOfBirth}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <select id="gender" name="gender" defaultValue="" required className={nativeSelectClassName}>
          <option value="" disabled>
            Select gender
          </option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit KYC"}
      </Button>
    </form>
  );
}
