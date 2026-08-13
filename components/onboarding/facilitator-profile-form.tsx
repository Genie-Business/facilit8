"use client";

import { useActionState } from "react";

import { updateFacilitatorProfileAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AUDIENCE_SENIORITIES,
  AUDIENCE_SIZES,
  FACILITATION_SKILL_LABELS,
  FACILITATOR_TRAINING_FORMATS,
  PROFICIENCY_LABELS,
} from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function FacilitatorProfileForm({
  profile,
  skillRatings,
}: {
  profile: {
    yearsFacilitating: number | null;
    sessionsDelivered: number | null;
    delegatesTrained: number | null;
    typicalAudienceSize: string | null;
    typicalAudienceSeniority: string | null;
    trainingFormats: string[];
    industriesServed: string[];
    canTrainNow: string[];
    wantToTrain: string[];
    facilitatorGoals: string | null;
  } | null;
  skillRatings: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(updateFacilitatorProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearsFacilitating">Years facilitating</Label>
          <Input
            id="yearsFacilitating"
            name="yearsFacilitating"
            type="number"
            min={0}
            defaultValue={profile?.yearsFacilitating ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionsDelivered">Sessions delivered</Label>
          <Input
            id="sessionsDelivered"
            name="sessionsDelivered"
            type="number"
            min={0}
            defaultValue={profile?.sessionsDelivered ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delegatesTrained">Delegates trained</Label>
          <Input
            id="delegatesTrained"
            name="delegatesTrained"
            type="number"
            min={0}
            defaultValue={profile?.delegatesTrained ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="typicalAudienceSize">Typical audience size</Label>
          <select
            id="typicalAudienceSize"
            name="typicalAudienceSize"
            defaultValue={profile?.typicalAudienceSize ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {AUDIENCE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="typicalAudienceSeniority">Typical audience seniority</Label>
          <select
            id="typicalAudienceSeniority"
            name="typicalAudienceSeniority"
            defaultValue={profile?.typicalAudienceSeniority ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {AUDIENCE_SENIORITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Training formats you deliver</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {FACILITATOR_TRAINING_FORMATS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="trainingFormats"
                value={format}
                defaultChecked={profile?.trainingFormats.includes(format)}
                className="size-4 rounded border-input"
              />
              {format}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industriesServed">Industries you've served (comma-separated)</Label>
        <Input
          id="industriesServed"
          name="industriesServed"
          defaultValue={(profile?.industriesServed ?? []).join(", ")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="canTrainNow">What can you confidently train on today? (comma-separated)</Label>
          <Input id="canTrainNow" name="canTrainNow" defaultValue={(profile?.canTrainNow ?? []).join(", ")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wantToTrain">What would you like to become qualified to train on? (comma-separated)</Label>
          <Input id="wantToTrain" name="wantToTrain" defaultValue={(profile?.wantToTrain ?? []).join(", ")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Facilitation skills — rate yourself</Label>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-input p-3">
          {Object.entries(FACILITATION_SKILL_LABELS).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`skillRating_${key}`} className="text-xs text-muted-foreground">
                {label}
              </Label>
              <select
                id={`skillRating_${key}`}
                name={`skillRating_${key}`}
                defaultValue={skillRatings[key] ?? ""}
                className={nativeSelectClassName}
              >
                <option value="">Not rated</option>
                {Object.entries(PROFICIENCY_LABELS).map(([value, proficiencyLabel]) => (
                  <option key={value} value={value}>
                    {proficiencyLabel}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="facilitatorGoals">What are your goals as a facilitator on Facilit8?</Label>
        <Textarea id="facilitatorGoals" name="facilitatorGoals" rows={2} defaultValue={profile?.facilitatorGoals ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
