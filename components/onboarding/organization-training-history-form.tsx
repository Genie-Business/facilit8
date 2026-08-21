"use client";

import { useActionState, useEffect } from "react";

import { addOrganizationTrainingHistoryAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function OrganizationTrainingHistoryForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(addOrganizationTrainingHistoryAction, initialState);

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
          <Label htmlFor="oth-title">Title</Label>
          <Input id="oth-title" name="title" required />
          {state.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="oth-provider">Provider</Label>
          <Input id="oth-provider" name="provider" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="oth-dateCompleted">Date completed</Label>
        <Input id="oth-dateCompleted" name="dateCompleted" type="date" required />
        {state.fieldErrors?.dateCompleted && (
          <p className="text-sm text-destructive">{state.fieldErrors.dateCompleted}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="oth-notes">Notes</Label>
        <Textarea id="oth-notes" name="notes" rows={2} />
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
