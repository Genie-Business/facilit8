"use client";

import { useActionState } from "react";

import { resolveDisputeAction } from "@/lib/actions/admin-dispute.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function ResolveDisputeForm({ disputeId, alreadyPaid }: { disputeId: string; alreadyPaid: boolean }) {
  const [state, formAction, pending] = useActionState(resolveDisputeAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="disputeId" value={disputeId} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Textarea
        name="resolutionNotes"
        placeholder="Resolution notes (what you found, what you decided)"
        rows={2}
        required
      />
      {state.fieldErrors?.resolutionNotes && (
        <p className="text-sm text-destructive">{state.fieldErrors.resolutionNotes}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" name="status" value="RESOLVED_REFUNDED" size="sm" disabled={pending || alreadyPaid}>
          Refund
        </Button>
        <Button type="submit" name="status" value="RESOLVED_NO_ACTION" size="sm" variant="outline" disabled={pending}>
          No action
        </Button>
      </div>
      {alreadyPaid && (
        <p className="text-xs text-muted-foreground">
          Already paid out to the facilitator — refunding needs manual, off-platform recovery.
        </p>
      )}
    </form>
  );
}
