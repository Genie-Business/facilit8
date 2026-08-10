import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasChatAccess } from "@/lib/services/chat.service";
import { getActiveChatPricing } from "@/lib/services/chat-payment.service";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PayForChatForm } from "@/components/chat/pay-for-chat-form";

export default async function ChatPaymentPage({
  params,
}: {
  params: Promise<{ conversationSlug: string }>;
}) {
  const { conversationSlug } = await params;
  const session = await auth();
  if (!session) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { slug: conversationSlug },
    include: { facilitator: { select: { firstName: true, lastName: true } } },
  });
  if (!conversation) notFound();
  if (conversation.eventManagerId !== session.user.id && conversation.facilitatorId !== session.user.id) {
    notFound();
  }

  const access = await hasChatAccess(conversation);
  if (access) redirect(`/chat/${conversation.slug}`);

  const pricing = await getActiveChatPricing();

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">
        Unlock chat with {conversation.facilitator.firstName} {conversation.facilitator.lastName}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>₦{Number(pricing.amount).toLocaleString()}</p>
          <p className="text-muted-foreground">{pricing.durationDays} days of access</p>
        </CardContent>

        {session.user.role === "EVENT_MANAGER" ? (
          <PayForChatForm conversationSlug={conversation.slug} />
        ) : (
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Waiting for the Event Manager to unlock this conversation.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
