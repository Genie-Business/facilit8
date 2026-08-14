"use client";

import { useActionState } from "react";

import { subscribeToAweAction } from "@/lib/actions/awe.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function SubscribeToAweForm() {
  const [state, formAction, pending] = useActionState(subscribeToAweAction, initialState);

  return (
    <form action={formAction}>
      {state.error && (
        <div style={{ marginBottom: 12 }}>
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      )}
      <Button type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "Processing..." : "Subscribe & unlock Awé"}
      </Button>
    </form>
  );
}
