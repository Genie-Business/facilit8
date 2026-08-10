"use client";

import { useActionState } from "react";

import { createReviewAction } from "@/lib/actions/review.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function ReviewForm({
  facilitatorSlug,
  eligibleEvents,
}: {
  facilitatorSlug: string;
  eligibleEvents: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(createReviewAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="facilitatorSlug" value={facilitatorSlug} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="trainingEventId">Which event was this for?</Label>
        <select
          id="trainingEventId"
          name="trainingEventId"
          defaultValue=""
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="" disabled>
            Select an event
          </option>
          {eligibleEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        {state.fieldErrors?.trainingEventId && (
          <p className="text-sm text-destructive">{state.fieldErrors.trainingEventId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating">Rating (1-5)</Label>
        <select
          id="rating"
          name="rating"
          defaultValue="5"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback">Feedback</Label>
        <Textarea id="feedback" name="feedback" rows={3} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  );
}
