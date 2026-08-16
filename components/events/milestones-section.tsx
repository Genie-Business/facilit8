"use client";

import { useActionState } from "react";

import { addMilestoneAction, deleteMilestoneAction, payMilestoneAction } from "@/lib/actions/milestone.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

interface MilestoneItem {
  id: string;
  title: string;
  amount: number;
  isPaidOut: boolean;
}

export function MilestonesSection({
  eventId,
  eventSlug,
  milestones,
  trainingBudget,
  canPay,
}: {
  eventId: string;
  eventSlug: string;
  milestones: MilestoneItem[];
  trainingBudget: number;
  canPay: boolean;
}) {
  const [state, formAction, pending] = useActionState(addMilestoneAction, initialState);

  const milestoneTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
  const anyPaidOut = milestones.some((m) => m.isPaidOut);
  const totalsMatch = Math.round(milestoneTotal * 100) === Math.round(trainingBudget * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {milestones.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--t-muted)" }}>
          No milestones yet. Add some to release the budget in stages instead of one lump sum, or leave this empty
          to pay out the whole budget at once when marked complete.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {milestones.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid var(--border-soft)",
                padding: "8px 0",
                fontSize: 13,
              }}
            >
              <span>
                {m.title} · ₦{m.amount.toLocaleString()}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.isPaidOut ? (
                  <span className="tag t-active">Paid</span>
                ) : (
                  <>
                    {canPay && totalsMatch && (
                      <form action={payMilestoneAction}>
                        <input type="hidden" name="milestoneId" value={m.id} />
                        <input type="hidden" name="eventSlug" value={eventSlug} />
                        <button type="submit" className="btn btn--primary" style={{ padding: "4px 10px", fontSize: 12 }}>
                          Pay
                        </button>
                      </form>
                    )}
                    {!anyPaidOut && (
                      <form action={deleteMilestoneAction.bind(null, m.id, eventSlug)}>
                        <button type="submit" className="btn btn--secondary" style={{ padding: "4px 10px", fontSize: 12 }}>
                          Remove
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: totalsMatch ? "var(--t-muted)" : "var(--danger)", marginTop: 6 }}>
            Milestones total ₦{milestoneTotal.toLocaleString()} of ₦{trainingBudget.toLocaleString()} budget.
            {!totalsMatch && " These must add up to the full budget before any milestone can be paid out."}
          </p>
        </div>
      )}

      {!anyPaidOut && (
        <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="eventSlug" value={eventSlug} />
          <Input name="title" placeholder="Milestone name" required style={{ maxWidth: 200 }} />
          <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (₦)" required style={{ maxWidth: 140 }} />
          <Button type="submit" size="sm" disabled={pending}>
            Add milestone
          </Button>
        </form>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.fieldErrors?.title && <p style={{ fontSize: 12, color: "var(--danger)" }}>{state.fieldErrors.title}</p>}
      {state.fieldErrors?.amount && <p style={{ fontSize: 12, color: "var(--danger)" }}>{state.fieldErrors.amount}</p>}
    </div>
  );
}
