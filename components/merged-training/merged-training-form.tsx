"use client";

import { useActionState, useState } from "react";

import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function toDateInputValue(date?: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export interface MergedTrainingFormDefaults {
  slug?: string;
  title?: string;
  description?: string | null;
  startDate?: Date | string;
  endDate?: Date | string;
  location?: string;
  delegatesLevel?: string;
  eventCategory?: string;
  venueType?: string;
  totalSlots?: number;
  pricePerDelegate?: number | string;
  deadline?: Date | string;
  isInviteOnly?: boolean;
  initiatorNumDelegates?: number;
  visibility?: "PUBLIC" | "TEAM_ONLY";
}

export interface InviteGroup {
  heading: string;
  /** The <select>'s form field name — lets the action distinguish which group a selection came from. */
  name: string;
  options: { id: string; label: string }[];
}

export function MergedTrainingForm({
  action,
  defaults,
  submitLabel,
  inviteGroups,
  hideInitiatorDelegates,
  canOfferTeamOnly = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: MergedTrainingFormDefaults;
  submitLabel: string;
  /** One group for a single-role picker (Event Manager/Professional), two for a Facilitator initiator (organisations to fund + co-facilitators). */
  inviteGroups?: InviteGroup[];
  /** True when the current user is a Facilitator — they're proposing/delivering, not funding a delegate share. */
  hideInitiatorDelegates?: boolean;
  /** Only an OWNER/MANAGER of an org can restrict the board listing to their own team. */
  canOfferTeamOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isInviteOnly, setIsInviteOnly] = useState(!!defaults?.isInviteOnly);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {defaults?.slug && <input type="hidden" name="slug" value={defaults.slug} />}

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
        {state.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? undefined} rows={3} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(defaults?.startDate)}
            required
          />
          {state.fieldErrors?.startDate && (
            <p className="text-sm text-destructive">{state.fieldErrors.startDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(defaults?.endDate)}
            required
          />
          {state.fieldErrors?.endDate && <p className="text-sm text-destructive">{state.fieldErrors.endDate}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Funding deadline</Label>
        <Input
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={toDateInputValue(defaults?.deadline)}
          required
        />
        {state.fieldErrors?.deadline && <p className="text-sm text-destructive">{state.fieldErrors.deadline}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={defaults?.location} required />
        {state.fieldErrors?.location && <p className="text-sm text-destructive">{state.fieldErrors.location}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="totalSlots">Total delegate slots</Label>
          <Input id="totalSlots" name="totalSlots" type="number" min={1} defaultValue={defaults?.totalSlots} required />
          {state.fieldErrors?.totalSlots && (
            <p className="text-sm text-destructive">{state.fieldErrors.totalSlots}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerDelegate">Price per delegate (₦)</Label>
          <Input
            id="pricePerDelegate"
            name="pricePerDelegate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults?.pricePerDelegate !== undefined ? String(defaults.pricePerDelegate) : undefined}
            required
          />
          {state.fieldErrors?.pricePerDelegate && (
            <p className="text-sm text-destructive">{state.fieldErrors.pricePerDelegate}</p>
          )}
        </div>
      </div>

      {!defaults?.slug && !hideInitiatorDelegates && (
        <div className="space-y-2">
          <Label htmlFor="initiatorNumDelegates">Your own delegate count</Label>
          <Input id="initiatorNumDelegates" name="initiatorNumDelegates" type="number" min={1} required />
          {state.fieldErrors?.initiatorNumDelegates && (
            <p className="text-sm text-destructive">{state.fieldErrors.initiatorNumDelegates}</p>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="delegatesLevel">Delegates level</Label>
          <Input id="delegatesLevel" name="delegatesLevel" defaultValue={defaults?.delegatesLevel} required />
          {state.fieldErrors?.delegatesLevel && (
            <p className="text-sm text-destructive">{state.fieldErrors.delegatesLevel}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventCategory">Event category</Label>
          <Input id="eventCategory" name="eventCategory" defaultValue={defaults?.eventCategory} required />
          {state.fieldErrors?.eventCategory && (
            <p className="text-sm text-destructive">{state.fieldErrors.eventCategory}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venueType">Venue type</Label>
        <Input id="venueType" name="venueType" defaultValue={defaults?.venueType} required />
        {state.fieldErrors?.venueType && <p className="text-sm text-destructive">{state.fieldErrors.venueType}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isInviteOnly"
          name="isInviteOnly"
          type="checkbox"
          checked={isInviteOnly}
          onChange={(e) => setIsInviteOnly(e.target.checked)}
          className="size-4 rounded border-input"
        />
        <Label htmlFor="isInviteOnly" className="font-normal">
          Invite-only (not shown on the public board)
        </Label>
      </div>

      {canOfferTeamOnly && (
        <div className="space-y-2">
          <Label htmlFor="visibility">Who can see this on the board</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={defaults?.visibility ?? "PUBLIC"}
            className={nativeSelectClassName}
          >
            <option value="PUBLIC">Public — anyone on Facilit8</option>
            <option value="TEAM_ONLY">Team only — your org's members (Facilitators can still bid)</option>
          </select>
        </div>
      )}

      {isInviteOnly &&
        inviteGroups?.map((group) =>
          group.options.length > 0 ? (
            <div key={group.heading} className="space-y-2">
              <Label htmlFor={`invite-${group.heading}`}>{group.heading} (hold Ctrl/Cmd to select multiple)</Label>
              <select
                id={`invite-${group.heading}`}
                name={group.name}
                multiple
                className="h-32 w-full rounded-lg border border-input bg-transparent p-2 text-sm"
              >
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
