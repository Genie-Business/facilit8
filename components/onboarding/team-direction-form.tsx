"use client";

import { useActionState } from "react";

import { updateTeamDirectionAction, markTeamGoalsAchievedAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function TeamDirectionForm({
  profile,
}: {
  profile: { teamGoals: string | null; teamGoalTimeline: string | null; teamGoalsAchievedAt: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(updateTeamDirectionAction, initialState);

  return (
    <div className="space-y-4">
      {profile?.teamGoalsAchievedAt && (
        <Alert>
          <AlertDescription>
            Marked achieved on {new Date(profile.teamGoalsAchievedAt).toLocaleDateString()}. Set new goals below to
            continue.
          </AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-4">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1">
          <Label htmlFor="teamGoals">What is your team trying to achieve?</Label>
          <Textarea id="teamGoals" name="teamGoals" rows={3} defaultValue={profile?.teamGoals ?? ""} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="teamGoalTimeline">Timeline</Label>
          <Input
            id="teamGoalTimeline"
            name="teamGoalTimeline"
            placeholder="e.g. Next 6 months"
            defaultValue={profile?.teamGoalTimeline ?? ""}
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Continue"}
        </Button>
      </form>

      {profile?.teamGoals && !profile.teamGoalsAchievedAt && (
        <form action={markTeamGoalsAchievedAction}>
          <Button type="submit" variant="outline" size="sm">
            Mark current goals as achieved
          </Button>
        </form>
      )}
    </div>
  );
}
