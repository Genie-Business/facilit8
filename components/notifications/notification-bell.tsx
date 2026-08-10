"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { userChannel, EVENTS } from "@/lib/pusher/channels";

interface NotificationPayload {
  id: string;
}

export function NotificationBell({ userId, initialUnreadCount }: { userId: string; initialUnreadCount: number }) {
  const [count, setCount] = useState(initialUnreadCount);

  usePusherChannel<NotificationPayload>(userChannel(userId), EVENTS.NOTIFICATION_NEW, () => {
    setCount((c) => c + 1);
  });

  return (
    <Link
      href="/notifications"
      className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="size-[18px]" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
