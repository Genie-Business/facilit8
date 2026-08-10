"use client";

import { useActionState, useState } from "react";

import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

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
}

export function MergedTrainingForm({
  action,
  defaults,
  submitLabel,
  invitableCompanies,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: MergedTrainingFormDefaults;
  submitLabel: string;
  invitableCompanies?: { id: string; label: string }[];
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

      {!defaults?.slug && (
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

      {isInviteOnly && invitableCompanies && invitableCompanies.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="invitedUserIds">Invite companies (hold Ctrl/Cmd to select multiple)</Label>
          <select id="invitedUserIds" name="invitedUserIds" multiple className="h-32 w-full rounded-lg border border-input bg-transparent p-2 text-sm">
            {invitableCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
