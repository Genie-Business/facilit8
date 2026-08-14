"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { conversationChannel, EVENTS } from "@/lib/pusher/channels";
import { sendMessageAction } from "@/lib/actions/chat.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

const initialState: ActionState = {};

export function ChatThread({
  conversationId,
  conversationSlug,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  conversationSlug: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);

  usePusherChannel<ChatMessage>(conversationChannel(conversationId), EVENTS.MESSAGE_NEW, (incoming) => {
    setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <div className="flex h-[70vh] max-w-2xl flex-col rounded-lg border">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>}
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      <form ref={formRef} action={formAction} className="flex items-center gap-2 border-t p-3">
        <input type="hidden" name="conversationSlug" value={conversationSlug} />
        <Input name="content" placeholder="Type a message..." autoComplete="off" required className="flex-1" />
        <Button type="submit" disabled={pending}>
          Send
        </Button>
      </form>
      {state.error && (
        <div className="px-3 pb-3">
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
