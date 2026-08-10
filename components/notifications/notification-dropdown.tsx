"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { userChannel, EVENTS } from "@/lib/pusher/channels";

export interface NotificationItem {
  id: string;
  slug: string;
  message: string;
  notificationType: string;
  link: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} MIN AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} HR AGO`;
  return `${Math.floor(hours / 24)} DAY${hours >= 48 ? "S" : ""} AGO`;
}

export function NotificationDropdown({
  userId,
  initialNotifications,
  initialUnreadCount,
}: {
  userId: string;
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [count, setCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  usePusherChannel<NotificationItem>(userChannel(userId), EVENTS.NOTIFICATION_NEW, (payload) => {
    setItems((prev) => [payload, ...prev].slice(0, 6));
    setCount((c) => c + 1);
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className={`dd-wrap${open ? " is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        data-dropdown
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {count > 0 && <span className="count danger">{count > 9 ? "9+" : count}</span>}
      </button>
      <div className="dd-menu" role="menu">
        <div className="dd-head">
          <Bell />
          Notifications
        </div>
        <div className="dd-list">
          {items.length === 0 && (
            <div className="dd-item" style={{ gridTemplateColumns: "1fr" }}>
              <div className="dd-body">
                <div className="dd-text">You&apos;re all caught up.</div>
              </div>
            </div>
          )}
          {items.map((n) => (
            <Link key={n.id} className="dd-item" href={n.link ?? `/notifications/${n.slug}`} onClick={() => setOpen(false)}>
              <div className="dd-avatar a1">
                <Bell style={{ height: 14, width: 14 }} />
              </div>
              <div className="dd-body">
                <div className="dd-text">{n.message}</div>
                <div className="dd-time">{timeAgo(n.createdAt)}</div>
              </div>
            </Link>
          ))}
        </div>
        <Link className="dd-footer" href="/notifications" onClick={() => setOpen(false)}>
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
