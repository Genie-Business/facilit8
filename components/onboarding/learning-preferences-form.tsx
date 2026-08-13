"use client";

import { useActionState } from "react";

import { updateLearningPreferencesAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AVAILABLE_LEARNING_TIMES,
  LEARNING_FORMATS,
  PREFERRED_DELIVERIES,
  PREFERRED_SCHEDULES,
} from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function LearningPreferencesForm({
  profile,
}: {
  profile: {
    learningFormats: string[];
    availableLearningTime: string | null;
    preferredSchedule: string[];
    preferredDelivery: string | null;
    preferredLearningStyle: string | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(updateLearningPreferencesAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Preferred learning formats</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {LEARNING_FORMATS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="learningFormats"
                value={format}
                defaultChecked={profile?.learningFormats.includes(format)}
                className="size-4 rounded border-input"
              />
              {format}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="availableLearningTime">Time available for learning</Label>
          <select
            id="availableLearningTime"
            name="availableLearningTime"
            defaultValue={profile?.availableLearningTime ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {AVAILABLE_LEARNING_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredDelivery">Preferred delivery</Label>
          <select
            id="preferredDelivery"
            name="preferredDelivery"
            defaultValue={profile?.preferredDelivery ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {PREFERRED_DELIVERIES.map((delivery) => (
              <option key={delivery} value={delivery}>
                {delivery}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred schedule</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {PREFERRED_SCHEDULES.map((schedule) => (
            <label key={schedule} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="preferredSchedule"
                value={schedule}
                defaultChecked={profile?.preferredSchedule.includes(schedule)}
                className="size-4 rounded border-input"
              />
              {schedule}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredLearningStyle">Anything else about how you learn best?</Label>
        <Textarea
          id="preferredLearningStyle"
          name="preferredLearningStyle"
          rows={2}
          defaultValue={profile?.preferredLearningStyle ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
