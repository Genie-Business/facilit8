"use client";

import { useEffect, useRef } from "react";

import { getPusherClient } from "@/lib/pusher/client";

/**
 * Subscribes to a private Pusher channel/event for the lifetime of the component. No-ops
 * if Pusher isn't configured (getPusherClient returns null) or channelName is falsy.
 */
export function usePusherChannel<T = unknown>(
  channelName: string | null | undefined,
  eventName: string,
  handler: (data: T) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channelName) return;
    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(channelName);
    const listener = (data: T) => handlerRef.current(data);
    channel.bind(eventName, listener);

    return () => {
      channel.unbind(eventName, listener);
      client.unsubscribe(channelName);
    };
  }, [channelName, eventName]);
}
