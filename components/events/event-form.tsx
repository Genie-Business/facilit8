"use client";

import { useActionState } from "react";

import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

function toDateInputValue(date?: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export interface EventFormDefaults {
  slug?: string;
  title?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  location?: string;
  capacity?: number;
  skillType?: string;
  expectedTrainingSkills?: string | null;
  eventObjective?: string | null;
  delegatesLevel?: string;
  eventCategory?: string;
  venueType?: string;
  seriesLength?: number | null;
  eventExpiryDate?: Date | string;
  eventDetails?: string | null;
  trainingMaterials?: boolean;
  trainingBudget?: number | string;
}

export function EventForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: EventFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

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
        <Label htmlFor="eventExpiryDate">Application deadline</Label>
        <Input
          id="eventExpiryDate"
          name="eventExpiryDate"
          type="date"
          defaultValue={toDateInputValue(defaults?.eventExpiryDate)}
          required
        />
        {state.fieldErrors?.eventExpiryDate && (
          <p className="text-sm text-destructive">{state.fieldErrors.eventExpiryDate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={defaults?.location} required />
        {state.fieldErrors?.location && <p className="text-sm text-destructive">{state.fieldErrors.location}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={defaults?.capacity} required />
          {state.fieldErrors?.capacity && (
            <p className="text-sm text-destructive">{state.fieldErrors.capacity}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="trainingBudget">Training budget (₦)</Label>
          <Input
            id="trainingBudget"
            name="trainingBudget"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults?.trainingBudget !== undefined ? String(defaults.trainingBudget) : undefined}
            required
          />
          {state.fieldErrors?.trainingBudget && (
            <p className="text-sm text-destructive">{state.fieldErrors.trainingBudget}</p>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="skillType">Skill type</Label>
          <Input id="skillType" name="skillType" defaultValue={defaults?.skillType} required />
          {state.fieldErrors?.skillType && (
            <p className="text-sm text-destructive">{state.fieldErrors.skillType}</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="delegatesLevel">Delegates level</Label>
          <Input id="delegatesLevel" name="delegatesLevel" defaultValue={defaults?.delegatesLevel} required />
          {state.fieldErrors?.delegatesLevel && (
            <p className="text-sm text-destructive">{state.fieldErrors.delegatesLevel}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="venueType">Venue type</Label>
          <Input id="venueType" name="venueType" defaultValue={defaults?.venueType} required />
          {state.fieldErrors?.venueType && (
            <p className="text-sm text-destructive">{state.fieldErrors.venueType}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seriesLength">Series length (optional, days)</Label>
        <Input
          id="seriesLength"
          name="seriesLength"
          type="number"
          min={1}
          defaultValue={defaults?.seriesLength ?? undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedTrainingSkills">Expected training skills</Label>
        <Textarea
          id="expectedTrainingSkills"
          name="expectedTrainingSkills"
          defaultValue={defaults?.expectedTrainingSkills ?? undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventObjective">Event objective</Label>
        <Textarea id="eventObjective" name="eventObjective" defaultValue={defaults?.eventObjective ?? undefined} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDetails">Event details</Label>
        <Textarea id="eventDetails" name="eventDetails" defaultValue={defaults?.eventDetails ?? undefined} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="trainingMaterials" name="trainingMaterials" defaultChecked={defaults?.trainingMaterials} />
        <Label htmlFor="trainingMaterials" className="font-normal">
          Training materials provided
        </Label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
