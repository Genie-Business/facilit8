"use client";

import { useActionState } from "react";

import { payForChatAction } from "@/lib/actions/chat.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardFooter } from "@/components/ui/card";

const initialState: ActionState = {};

export function PayForChatForm({ conversationSlug }: { conversationSlug: string }) {
  const [state, formAction, pending] = useActionState(payForChatAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="conversationSlug" value={conversationSlug} />
      {state.error && (
        <div className="px-(--card-spacing) pb-(--card-spacing)">
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      )}
      <CardFooter className="justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Processing..." : "Pay & unlock chat"}
        </Button>
      </CardFooter>
    </form>
  );
}
