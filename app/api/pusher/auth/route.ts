import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPusherServer } from "@/lib/pusher/server";
import { userChannel } from "@/lib/pusher/channels";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pusher = getPusherServer();
  if (!pusher) return NextResponse.json({ error: "Realtime is not configured." }, { status: 503 });

  const formData = await request.formData();
  const socketId = formData.get("socket_id");
  const channelName = formData.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (channelName === userChannel(session.user.id)) {
    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  }

  const conversationMatch = channelName.match(/^private-conversation-(.+)$/);
  if (conversationMatch) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationMatch[1] } });
    if (
      conversation &&
      (conversation.eventManagerId === session.user.id || conversation.facilitatorId === session.user.id)
    ) {
      return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
    }
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
