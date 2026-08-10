"use client";

import PusherClient from "pusher-js";

let instance: PusherClient | null = null;

/** Returns null when NEXT_PUBLIC_PUSHER_KEY isn't configured — callers should no-op. */
export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!instance) {
    instance = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return instance;
}
