"use client";

import { useActionState } from "react";

import { completeOnboardingAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function MeetAweForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="tellAweText">Tell Awé about your professional journey</Label>
        <Textarea
          id="tellAweText"
          name="tellAweText"
          rows={6}
          maxLength={4000}
          placeholder="What drives you? What are you proud of? What do you want Awé to know that the form above didn't ask about?"
          defaultValue={defaultValue}
        />
        {state.fieldErrors?.tellAweText && (
          <p className="text-sm text-destructive">{state.fieldErrors.tellAweText}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Finishing up..." : "Finish and go to my dashboard"}
      </Button>
    </form>
  );
}
