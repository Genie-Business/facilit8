// Single source of truth for Pusher channel/event names, imported by both the trigger
// side (server) and the subscriber side (client) — this is what fixes Django's old
// notification bug, where the publisher and consumer used two different, hand-typed
// group names and the push silently never arrived. See plan §5.

export function userChannel(userId: string): string {
  return `private-user-${userId}`;
}

export function conversationChannel(conversationId: string): string {
  return `private-conversation-${conversationId}`;
}

export function aweConversationChannel(conversationId: string): string {
  return `private-awe-conversation-${conversationId}`;
}

export const EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  MESSAGE_NEW: "message:new",
  AWE_MESSAGE_NEW: "awe-message:new",
} as const;
