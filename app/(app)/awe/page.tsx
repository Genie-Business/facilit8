import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasAweAccess } from "@/lib/services/awe-subscription.service";
import { listAweConversations } from "@/lib/services/awe-chat.service";
import { AweConversationList } from "@/components/awe/awe-conversation-list";
import { AweChatThread } from "@/components/awe/awe-chat-thread";

export const metadata: Metadata = {
  title: "Awé",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

export default async function AwePage() {
  const session = await auth();
  if (!session) return null;

  const access = await hasAweAccess(session.user.id);
  if (!access) redirect("/awe/subscribe");

  const conversations = await listAweConversations(session.user.id);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Communications</span>
          <h1 className="hero-title">Awé</h1>
          <p className="hero-sub">Your AI Career &amp; Professional Growth Partner.</p>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        <AweConversationList conversations={conversations} />
        <AweChatThread conversationId={null} initialMessages={[]} />
      </div>
    </>
  );
}
