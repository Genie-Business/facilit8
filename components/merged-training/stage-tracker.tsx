import { Check } from "lucide-react";

import type { MergedTrainingStage } from "@/lib/utils/merged-training-stages";

export function StageTracker({ stages, currentIndex }: { stages: MergedTrainingStage[]; currentIndex: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {stages.map((stage, i) => {
        const isCurrent = i === currentIndex;
        const isDone = stage.complete;
        const circleColor = isDone ? "var(--primary)" : isCurrent ? "var(--primary)" : "var(--border)";
        const textColor = isDone || isCurrent ? "var(--t-base)" : "var(--t-light)";

        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "flex-start", flex: i === stages.length - 1 ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 88 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: isDone ? "var(--primary)" : "var(--bg-card)",
                  border: `2px solid ${circleColor}`,
                  color: isDone ? "#fff" : isCurrent ? "var(--primary)" : "var(--t-light)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isDone ? <Check style={{ width: 15, height: 15 }} /> : i + 1}
              </div>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 11.5,
                  textAlign: "center",
                  lineHeight: 1.3,
                  color: textColor,
                  fontWeight: isCurrent ? 600 : 500,
                }}
              >
                {stage.label}
              </span>
            </div>

            {i !== stages.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  marginTop: 13,
                  background: isDone ? "var(--primary)" : "var(--border)",
                  minWidth: 20,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
