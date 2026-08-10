import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasChatAccess } from "@/lib/services/chat.service";
import { ChatThread } from "@/components/chat/chat-thread";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationSlug: string }>;
}) {
  const { conversationSlug } = await params;
  const session = await auth();
  if (!session) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { slug: conversationSlug },
    include: {
      eventManager: { select: { firstName: true, lastName: true, organization: true } },
      facilitator: { select: { firstName: true, lastName: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!conversation) notFound();
  if (conversation.eventManagerId !== session.user.id && conversation.facilitatorId !== session.user.id) {
    notFound();
  }

  const access = await hasChatAccess(conversation);
  if (!access) redirect(`/chat/${conversation.slug}/pay`);

  const isManager = conversation.eventManagerId === session.user.id;
  const otherLabel = isManager
    ? `${conversation.facilitator.firstName} ${conversation.facilitator.lastName}`
    : conversation.eventManager.organization ||
      `${conversation.eventManager.firstName} ${conversation.eventManager.lastName}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{otherLabel}</h1>
      <ChatThread
        conversationId={conversation.id}
        conversationSlug={conversation.slug}
        currentUserId={session.user.id}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
