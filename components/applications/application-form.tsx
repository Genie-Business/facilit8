"use client";

import { useActionState } from "react";

import { applyToEventAction } from "@/lib/actions/application.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function ApplicationForm({ eventSlug }: { eventSlug: string }) {
  const [state, formAction, pending] = useActionState(applyToEventAction, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="eventSlug" value={eventSlug} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="classActivities">Activities</Label>
        <p className="text-sm text-muted-foreground">What you&apos;ll actually run in the room — exercises, discussions, group work.</p>
        <Textarea id="classActivities" name="classActivities" rows={4} required />
        {state.fieldErrors?.classActivities && (
          <p className="text-sm text-destructive">{state.fieldErrors.classActivities}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Expected outcomes</Label>
        <p className="text-sm text-muted-foreground">What delegates should be able to do differently by the end.</p>
        <Textarea id="objective" name="objective" rows={3} required />
        {state.fieldErrors?.objective && <p className="text-sm text-destructive">{state.fieldErrors.objective}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseBreakdown">Course breakdown (optional)</Label>
        <Textarea id="courseBreakdown" name="courseBreakdown" rows={4} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}
