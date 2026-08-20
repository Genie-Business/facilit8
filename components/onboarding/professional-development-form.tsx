"use client";

import { useActionState, useEffect } from "react";

import { addProfessionalDevelopmentAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PROFESSIONAL_DEVELOPMENT_TYPE_LABELS } from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function ProfessionalDevelopmentForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(addProfessionalDevelopmentAction, initialState);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-input p-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="pd-type">Type</Label>
          <select id="pd-type" name="type" defaultValue="COURSE" className={nativeSelectClassName}>
            {Object.entries(PROFESSIONAL_DEVELOPMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pd-title">Title</Label>
          <Input id="pd-title" name="title" required />
          {state.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title}</p>}
        </div>
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="pd-provider">Provider</Label>
          <Input id="pd-provider" name="provider" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pd-dateCompleted">Date completed</Label>
          <Input id="pd-dateCompleted" name="dateCompleted" type="date" required />
          {state.fieldErrors?.dateCompleted && (
            <p className="text-sm text-destructive">{state.fieldErrors.dateCompleted}</p>
          )}
        </div>
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="pd-skillsAcquired">Skills acquired (comma-separated)</Label>
          <Input id="pd-skillsAcquired" name="skillsAcquired" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pd-expiryDate">Expiry date (if any)</Label>
          <Input id="pd-expiryDate" name="expiryDate" type="date" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add record"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
