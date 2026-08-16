"use client";

import { useActionState, useState } from "react";

import { raiseDisputeAction } from "@/lib/actions/dispute.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function RaiseDisputeForm({
  targetType,
  targetId,
  revalidateSlug,
}: {
  targetType: "TRAINING_EVENT" | "MERGED_TRAINING_EVENT";
  targetId: string;
  revalidateSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(raiseDisputeAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>
        Didn&apos;t happen? Request a refund
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md space-y-2">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="revalidateSlug" value={revalidateSlug} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Textarea
        name="reason"
        placeholder="What happened? (e.g. the facilitator never showed up, the session didn't run)"
        rows={3}
        required
        minLength={10}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          Submit refund request
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
