"use client";

import { useActionState, useEffect, useRef } from "react";

import { createFaqAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function FaqForm() {
  const [state, formAction, pending] = useActionState(createFaqAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div>
        <Input name="question" placeholder="Question" required />
        {state.fieldErrors?.question && <p className="mt-1 text-sm text-destructive">{state.fieldErrors.question}</p>}
      </div>
      <div>
        <Textarea name="answer" placeholder="Answer" rows={3} required />
        {state.fieldErrors?.answer && <p className="mt-1 text-sm text-destructive">{state.fieldErrors.answer}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add FAQ"}
      </Button>
    </form>
  );
}
