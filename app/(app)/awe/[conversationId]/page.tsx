import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasAweAccess } from "@/lib/services/awe-subscription.service";
import { getAweConversation, listAweConversations } from "@/lib/services/awe-chat.service";
import { AweConversationList } from "@/components/awe/awe-conversation-list";
import { AweChatThread } from "@/components/awe/awe-chat-thread";

export const metadata: Metadata = {
  title: "Awé",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

export default async function AweConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session) return null;

  const access = await hasAweAccess(session.user.id);
  if (!access) redirect("/awe/subscribe");

  const [conversation, conversations] = await Promise.all([
    getAweConversation(conversationId, session.user.id),
    listAweConversations(session.user.id),
  ]);
  if (!conversation) notFound();

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Communications</span>
          <h1 className="hero-title">{conversation.title || "Awé"}</h1>
          <p className="hero-sub">Your AI Career &amp; Professional Growth Partner.</p>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        <AweConversationList conversations={conversations} activeId={conversation.id} />
        <AweChatThread
          conversationId={conversation.id}
          initialMessages={conversation.messages
            .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
            .map((m) => ({
              id: m.id,
              role: m.role as "USER" | "ASSISTANT",
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            }))}
        />
      </div>
    </>
  );
}
