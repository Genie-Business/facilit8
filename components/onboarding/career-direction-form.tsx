"use client";

import { useActionState } from "react";

import { updateCareerDirectionAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CAREER_GOAL_TAGS, CHALLENGE_TAGS, TARGET_CAREER_LEVELS, TARGET_TIMELINES } from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function CareerDirectionForm({
  profile,
}: {
  profile: {
    targetRole: string | null;
    targetIndustry: string | null;
    targetCareerLevel: string | null;
    targetTimeline: string | null;
    longTermAmbition: string | null;
    careerGoalTags: string[];
    topStrengths: string[];
    skillsToImprove: string[];
    weakSkills: string[];
    skillsToAcquire: string[];
    challengeTags: string[];
    challengeOther: string | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(updateCareerDirectionAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>What are you trying to achieve? (select all that apply)</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {CAREER_GOAL_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="careerGoalTags"
                value={tag}
                defaultChecked={profile?.careerGoalTags.includes(tag)}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetRole">Target role</Label>
          <Input id="targetRole" name="targetRole" defaultValue={profile?.targetRole ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetIndustry">Target industry</Label>
          <Input id="targetIndustry" name="targetIndustry" defaultValue={profile?.targetIndustry ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetCareerLevel">Target career level</Label>
          <select
            id="targetCareerLevel"
            name="targetCareerLevel"
            defaultValue={profile?.targetCareerLevel ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {TARGET_CAREER_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetTimeline">Timeline</Label>
          <select
            id="targetTimeline"
            name="targetTimeline"
            defaultValue={profile?.targetTimeline ?? ""}
            className={nativeSelectClassName}
          >
            <option value="">Select...</option>
            {TARGET_TIMELINES.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="longTermAmbition">Long-term ambition</Label>
        <Textarea
          id="longTermAmbition"
          name="longTermAmbition"
          rows={2}
          defaultValue={profile?.longTermAmbition ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="topStrengths">Top strengths (comma-separated)</Label>
          <Input id="topStrengths" name="topStrengths" defaultValue={(profile?.topStrengths ?? []).join(", ")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skillsToImprove">Skills to improve (comma-separated)</Label>
          <Input
            id="skillsToImprove"
            name="skillsToImprove"
            defaultValue={(profile?.skillsToImprove ?? []).join(", ")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weakSkills">Weak skills (comma-separated)</Label>
          <Input id="weakSkills" name="weakSkills" defaultValue={(profile?.weakSkills ?? []).join(", ")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skillsToAcquire">Skills to acquire (comma-separated)</Label>
          <Input
            id="skillsToAcquire"
            name="skillsToAcquire"
            defaultValue={(profile?.skillsToAcquire ?? []).join(", ")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>What's getting in the way? (select all that apply)</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
          {CHALLENGE_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="challengeTags"
                value={tag}
                defaultChecked={profile?.challengeTags.includes(tag)}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="challengeOther">Anything else getting in the way?</Label>
        <Input id="challengeOther" name="challengeOther" defaultValue={profile?.challengeOther ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
