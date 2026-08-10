"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { aweConversationChannel, EVENTS } from "@/lib/pusher/channels";
import { sendAweMessageAction, type AweSendMessageState } from "@/lib/actions/awe.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface AweMessageItem {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

const initialState: AweSendMessageState = {};

export function AweChatThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string | null;
  initialMessages: AweMessageItem[];
}) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<AweMessageItem[]>(initialMessages);
  const [state, formAction, pending] = useActionState(sendAweMessageAction, initialState);

  usePusherChannel<AweMessageItem>(
    conversationId ? aweConversationChannel(conversationId) : null,
    EVENTS.AWE_MESSAGE_NEW,
    (incoming) => {
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    }
  );

  useEffect(() => {
    if (state.userMessage) {
      const um = state.userMessage;
      setMessages((prev) => (prev.some((m) => m.id === um.id) ? prev : [...prev, um]));
    }
    if (state.assistantMessage) {
      const am = state.assistantMessage;
      setMessages((prev) => (prev.some((m) => m.id === am.id) ? prev : [...prev, am]));
    }
    // Only jump to the new conversation's URL once it actually has a reply — if the model
    // call failed, stay put so the error alert (and the user's own message) stay visible
    // instead of navigating to a thread that silently has no assistant message yet.
    if (!conversationId && state.conversationId && !state.error) {
      router.push(`/awe/${state.conversationId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh", padding: 0, overflow: "hidden" }}>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ color: "var(--t-muted)", fontSize: 13 }}>
            Ask Awe about your career, skills, or what to learn next.
          </p>
        )}
        {messages.map((message) => {
          const isMine = message.role === "USER";
          return (
            <div key={message.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "75%",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  background: isMine ? "var(--primary)" : "var(--bg-muted)",
                  color: isMine ? "#fff" : "var(--t-base)",
                }}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {pending && <p style={{ fontSize: 12, color: "var(--t-light)" }}>Awe is thinking…</p>}
      </div>

      <form
        ref={formRef}
        action={formAction}
        style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border-soft)" }}
      >
        {conversationId && <input type="hidden" name="conversationId" value={conversationId} />}
        <Input
          name="content"
          placeholder="Ask Awe anything about your career..."
          autoComplete="off"
          required
          disabled={pending}
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send"}
        </Button>
      </form>
      {state.error && (
        <div style={{ padding: "0 12px 12px" }}>
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
