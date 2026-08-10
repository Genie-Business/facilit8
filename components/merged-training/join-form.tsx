"use client";

import { useActionState } from "react";

import { joinMergedTrainingAction } from "@/lib/actions/merged-training.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function JoinForm({ slug, remainingSlots }: { slug: string; remainingSlots: number }) {
  const [state, formAction, pending] = useActionState(joinMergedTrainingAction, initialState);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="slug" value={slug} />
      <div className="space-y-1">
        <Input
          name="numDelegates"
          type="number"
          min={1}
          max={remainingSlots}
          placeholder="Delegates"
          className="w-28"
          required
        />
        {state.fieldErrors?.numDelegates && (
          <p className="text-sm text-destructive">{state.fieldErrors.numDelegates}</p>
        )}
        {state.error && (
          <Alert variant="destructive" className="w-64">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Joining..." : "Join"}
      </Button>
    </form>
  );
}
