import Pusher from "pusher";

let instance: Pusher | null = null;

function getPusher(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;

  if (!instance) {
    instance = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return instance;
}

/**
 * No-ops (with a console warning) when Pusher isn't configured, so notification/chat
 * writes still succeed in local dev without realtime credentials — only the live push is
 * skipped.
 */
export async function pusherTrigger(channel: string, event: string, data: unknown): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.warn(`[pusher:dev-noop] ${channel} ${event}`, data);
    return;
  }
  await pusher.trigger(channel, event, data);
}

export function getPusherServer(): Pusher | null {
  return getPusher();
}
