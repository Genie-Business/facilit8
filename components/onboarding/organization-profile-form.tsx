"use client";

import { useActionState } from "react";
import Link from "next/link";

import { updateOrganizationProfileAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  EMPLOYEE_COUNT_BANDS,
  ORGANIZATION_TYPES,
  PARTICIPATION_BARRIER_TAGS,
  PREFERRED_DELIVERIES,
  PREFERRED_SCHEDULES,
  TRAINING_CLASS_SIZES,
  TRAINING_DURATIONS,
  TRAINING_FREQUENCIES,
  TRAINING_NEED_TAGS,
  WORKFORCE_CHALLENGE_TAGS,
  WORKFORCE_LEVELS,
} from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

type OrganizationProfileData = {
  organizationType: string | null;
  website: string | null;
  employeeCountBand: string | null;
  locations: string[];
  yearEstablished: number | null;
  departments: string[];
  workforceLevels: string[];
  trainingNeeds: string[];
  workforceChallenges: string[];
  preferredFormat: string | null;
  preferredLocation: string | null;
  preferredSchedule: string[];
  trainingFrequency: string | null;
  typicalDuration: string | null;
  typicalClassSize: string | null;
  budgetRange: string | null;
  budgetCurrency: string;
  typicalAudience: string | null;
  strategicInitiatives: string[];
  skillsNeeded: string[];
  biggestChallenge: string | null;
  learningCulture: string | null;
  participationBarriers: string[];
} | null;

export function OrganizationProfileForm({ profile, disabled }: { profile: OrganizationProfileData; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateOrganizationProfileAction, initialState);

  if (disabled) {
    return (
      <Link href="/onboarding/meet-awe" className={buttonVariants({ variant: "outline" })}>
        Skip this step
      </Link>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="organizationType">Organization type</Label>
          <select
            id="organizationType"
            name="organizationType"
            defaultValue={profile?.organizationType ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeCountBand">Employee count</Label>
          <select
            id="employeeCountBand"
            name="employeeCountBand"
            defaultValue={profile?.employeeCountBand ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {EMPLOYEE_COUNT_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={profile?.website ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearEstablished">Year established</Label>
          <Input
            id="yearEstablished"
            name="yearEstablished"
            type="number"
            min={0}
            defaultValue={profile?.yearEstablished ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="locations">Locations (comma-separated)</Label>
          <Input id="locations" name="locations" defaultValue={(profile?.locations ?? []).join(", ")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departments">Departments (comma-separated)</Label>
          <Input id="departments" name="departments" defaultValue={(profile?.departments ?? []).join(", ")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Workforce levels present</Label>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-input p-3">
          {WORKFORCE_LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="workforceLevels"
                value={level}
                defaultChecked={profile?.workforceLevels.includes(level)}
                className="size-4 rounded border-input"
              />
              {level}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Training needs</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {TRAINING_NEED_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="trainingNeeds"
                value={tag}
                defaultChecked={profile?.trainingNeeds.includes(tag)}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Workforce challenges</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {WORKFORCE_CHALLENGE_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="workforceChallenges"
                value={tag}
                defaultChecked={profile?.workforceChallenges.includes(tag)}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredFormat">Preferred training format</Label>
          <select
            id="preferredFormat"
            name="preferredFormat"
            defaultValue={profile?.preferredFormat ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {PREFERRED_DELIVERIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredLocation">Preferred location</Label>
          <Input id="preferredLocation" name="preferredLocation" defaultValue={profile?.preferredLocation ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred training schedule</Label>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trainingFrequency">Training frequency</Label>
          <select
            id="trainingFrequency"
            name="trainingFrequency"
            defaultValue={profile?.trainingFrequency ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {TRAINING_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="typicalDuration">Typical duration</Label>
          <select
            id="typicalDuration"
            name="typicalDuration"
            defaultValue={profile?.typicalDuration ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {TRAINING_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="typicalClassSize">Typical class size</Label>
          <select
            id="typicalClassSize"
            name="typicalClassSize"
            defaultValue={profile?.typicalClassSize ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {TRAINING_CLASS_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budgetRange">Typical budget range</Label>
          <Input id="budgetRange" name="budgetRange" placeholder="e.g. ₦500,000 – ₦2,000,000" defaultValue={profile?.budgetRange ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetCurrency">Currency</Label>
          <Input id="budgetCurrency" name="budgetCurrency" defaultValue={profile?.budgetCurrency ?? "NGN"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="typicalAudience">Typical audience</Label>
          <Input id="typicalAudience" name="typicalAudience" placeholder="e.g. Mid-level managers" defaultValue={profile?.typicalAudience ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="strategicInitiatives">Strategic initiatives this year (comma-separated)</Label>
          <Input
            id="strategicInitiatives"
            name="strategicInitiatives"
            defaultValue={(profile?.strategicInitiatives ?? []).join(", ")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skillsNeeded">Skills your workforce needs (comma-separated)</Label>
          <Input id="skillsNeeded" name="skillsNeeded" defaultValue={(profile?.skillsNeeded ?? []).join(", ")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="biggestChallenge">
          What's the biggest workforce-development problem you want Facilit8 to help solve?
        </Label>
        <Textarea id="biggestChallenge" name="biggestChallenge" rows={2} defaultValue={profile?.biggestChallenge ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="learningCulture">How would you describe your organization's learning culture?</Label>
        <Textarea id="learningCulture" name="learningCulture" rows={2} defaultValue={profile?.learningCulture ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>What gets in the way of training participation?</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {PARTICIPATION_BARRIER_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="participationBarriers"
                value={tag}
                defaultChecked={profile?.participationBarriers.includes(tag)}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
