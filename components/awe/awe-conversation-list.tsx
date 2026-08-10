import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";

import { startAweConversationAction } from "@/lib/actions/awe.actions";

export interface AweConversationListItem {
  id: string;
  title: string | null;
}

export function AweConversationList({
  conversations,
  activeId,
}: {
  conversations: AweConversationListItem[];
  activeId?: string;
}) {
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={startAweConversationAction}>
        <button type="submit" className="btn btn--secondary" style={{ width: "100%", justifyContent: "center" }}>
          <Plus />
          New conversation
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {conversations.length === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--t-light)", padding: "8px 4px" }}>No conversations yet.</p>
        )}
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeId;
          return (
            <Link
              key={conversation.id}
              href={`/awe/${conversation.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 13,
                textDecoration: "none",
                color: isActive ? "var(--primary)" : "var(--t-base)",
                background: isActive ? "var(--primary-soft)" : "transparent",
              }}
            >
              <MessageSquare style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {conversation.title || "New conversation"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
