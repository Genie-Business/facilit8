"use client";

import { useActionState, useEffect, useRef } from "react";

import { createSkillAction } from "@/lib/actions/admin-skill.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function SkillForm() {
  const [state, formAction, pending] = useActionState(createSkillAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
        <Input name="name" placeholder="e.g. Emotional Intelligence" required />
        {state.error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add skill"}
      </Button>
    </form>
  );
}
