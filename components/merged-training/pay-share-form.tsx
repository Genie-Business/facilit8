"use client";

import { useActionState } from "react";

import { payMergedTrainingShareAction } from "@/lib/actions/merged-training.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};

export function PayShareForm({
  slug,
  mergedTrainingEventId,
}: {
  slug: string;
  mergedTrainingEventId: string;
}) {
  const [state, formAction, pending] = useActionState(payMergedTrainingShareAction, initialState);

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="mergedTrainingEventId" value={mergedTrainingEventId} />
        <Button type="submit" disabled={pending}>
          {pending ? "Processing..." : "Pay your share"}
        </Button>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
