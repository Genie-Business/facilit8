import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { hasChatAccess } from "@/lib/services/chat.service";

export default async function ChatInboxPage() {
  const session = await auth();
  if (!session) return null;

  const allConversations = await prisma.conversation.findMany({
    where: { OR: [{ eventManagerId: session.user.id }, { facilitatorId: session.user.id }] },
    orderBy: { updatedAt: "desc" },
    include: {
      eventManager: { select: { firstName: true, lastName: true, organization: true } },
      facilitator: { select: { firstName: true, lastName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Only unlocked (paid-for) conversations belong in the inbox — pending/unpaid ones are
  // reached via the "Chat" button on a facilitator's profile, which routes to the pay flow.
  const accessFlags = await Promise.all(allConversations.map((c) => hasChatAccess(c)));
  const conversations = allConversations.filter((_, i) => accessFlags[i]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Chat</h1>

      {conversations.length === 0 && (
        <p className="text-muted-foreground">
          No unlocked conversations yet. Pay to chat with a facilitator from their profile to start one.
        </p>
      )}

      <div className="space-y-2">
        {conversations.map((conversation) => {
          const isManager = conversation.eventManagerId === session.user.id;
          const otherLabel = isManager
            ? `${conversation.facilitator.firstName} ${conversation.facilitator.lastName}`
            : conversation.eventManager.organization ||
              `${conversation.eventManager.firstName} ${conversation.eventManager.lastName}`;
          const lastMessage = conversation.messages[0];

          return (
            <Link key={conversation.id} href={`/chat/${conversation.slug}`}>
              <Card>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{otherLabel}</p>
                    {lastMessage && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{lastMessage.content}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
