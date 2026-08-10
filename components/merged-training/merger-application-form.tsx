"use client";

import { useActionState } from "react";

import { applyToMergedEventAction } from "@/lib/actions/merged-training.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function MergerApplicationForm({ mergedTrainingSlug }: { mergedTrainingSlug: string }) {
  const [state, formAction, pending] = useActionState(applyToMergedEventAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="mergedTrainingSlug" value={mergedTrainingSlug} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="budgetPerDelegate">Your budget per delegate (₦)</Label>
        <Input id="budgetPerDelegate" name="budgetPerDelegate" type="number" min={0} step="0.01" required />
        {state.fieldErrors?.budgetPerDelegate && (
          <p className="text-sm text-destructive">{state.fieldErrors.budgetPerDelegate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseBreakdown">Course breakdown</Label>
        <Textarea id="courseBreakdown" name="courseBreakdown" rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Objective</Label>
        <Textarea id="objective" name="objective" rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="classActivities">Class activities</Label>
        <Textarea id="classActivities" name="classActivities" rows={3} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}
