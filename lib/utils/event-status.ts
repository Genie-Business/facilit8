export interface EventStatusInput {
  isCompleted: boolean;
  selectedTrainerId: string | null;
  paymentConfirmed: boolean;
  isAvailable: boolean;
}

export type BadgeVariant = "secondary" | "outline" | "default";

export function eventStatus(event: EventStatusInput): { label: string; variant: BadgeVariant } {
  if (event.isCompleted) return { label: "Completed", variant: "default" };
  if (event.selectedTrainerId) return { label: "Assigned", variant: "outline" };
  if (!event.paymentConfirmed) return { label: "Pending funding", variant: "outline" };
  if (event.isAvailable) return { label: "Open", variant: "secondary" };
  return { label: "Closed", variant: "outline" };
}

export interface MergedEventStatusInput {
  isCompleted: boolean;
  selectedTrainerId: string | null;
  cancelled: boolean;
}

/**
 * Merged trainings stay open to facilitator bids the whole time (funding progress doesn't
 * gate applications, unlike standard events) until a trainer is selected, it's cancelled, or
 * it wraps up.
 */
export function mergedEventStatus(event: MergedEventStatusInput): { label: string; variant: BadgeVariant } {
  if (event.cancelled) return { label: "Cancelled", variant: "outline" };
  if (event.isCompleted) return { label: "Completed", variant: "default" };
  if (event.selectedTrainerId) return { label: "Assigned", variant: "outline" };
  return { label: "Open", variant: "secondary" };
}
