"use client";

import { useActionState } from "react";

import { updateProfessionalProfileAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { HIGHEST_EDUCATION_LEVELS } from "@/lib/data/onboarding-options";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function ProfessionalProfileForm({
  profileImageUrl,
  profile,
  skills,
  selectedSkillIds,
}: {
  profileImageUrl: string | null;
  profile: {
    currentRole: string | null;
    currentEmployer: string | null;
    industry: string | null;
    yearsExperience: number | null;
    highestEducationLevel: string | null;
    professionalMemberships: string[];
    certifications: string[];
    languagesSpoken: string[];
  } | null;
  skills: { id: string; name: string }[];
  selectedSkillIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateProfessionalProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <ImageUploadField name="profileImageUrl" label="Profile picture (optional)" defaultUrl={profileImageUrl} />

      <div className="grid !grid-cols-2 !gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentRole">Current job title</Label>
          <Input id="currentRole" name="currentRole" defaultValue={profile?.currentRole ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentEmployer">Current employer</Label>
          <Input id="currentEmployer" name="currentEmployer" defaultValue={profile?.currentEmployer ?? ""} />
        </div>
      </div>

      <div className="grid !grid-cols-2 !gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" defaultValue={profile?.industry ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsExperience">Years of experience</Label>
          <Input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            defaultValue={profile?.yearsExperience ?? ""}
          />
          {state.fieldErrors?.yearsExperience && (
            <p className="text-sm text-destructive">{state.fieldErrors.yearsExperience}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="highestEducationLevel">Highest education level</Label>
        <select
          id="highestEducationLevel"
          name="highestEducationLevel"
          defaultValue={profile?.highestEducationLevel ?? ""}
          className={nativeSelectClassName}
        >
          <option value="">Select...</option>
          {HIGHEST_EDUCATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="professionalMemberships">Professional memberships (comma-separated)</Label>
        <Input
          id="professionalMemberships"
          name="professionalMemberships"
          placeholder="e.g. CIPM, NIM"
          defaultValue={(profile?.professionalMemberships ?? []).join(", ")}
        />
      </div>

      <div className="grid !grid-cols-2 !gap-4">
        <div className="space-y-2">
          <Label htmlFor="certifications">Certifications (comma-separated)</Label>
          <Input
            id="certifications"
            name="certifications"
            defaultValue={(profile?.certifications ?? []).join(", ")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="languagesSpoken">Languages spoken (comma-separated)</Label>
          <Input
            id="languagesSpoken"
            name="languagesSpoken"
            defaultValue={(profile?.languagesSpoken ?? []).join(", ")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        {skills.length === 0 ? (
          <p className="text-xs text-muted-foreground">No skills are listed yet. You can add these later.</p>
        ) : (
          <div className="grid !grid-cols-2 !gap-2 rounded-lg border border-input p-3">
            {skills.map((skill) => (
              <label key={skill.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="skillIds"
                  value={skill.id}
                  defaultChecked={selectedSkillIds.includes(skill.id)}
                  className="size-4 rounded border-input"
                />
                {skill.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
