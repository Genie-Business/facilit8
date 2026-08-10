"use client";

import { useActionState } from "react";

import { fundEventAction } from "@/lib/actions/event-funding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};

export function FundEventButton({ slug, eventId }: { slug: string; eventId: string }) {
  const [state, formAction, pending] = useActionState(fundEventAction, initialState);

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="eventId" value={eventId} />
        <Button type="submit" disabled={pending}>
          {pending ? "Funding..." : "Fund event"}
        </Button>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
