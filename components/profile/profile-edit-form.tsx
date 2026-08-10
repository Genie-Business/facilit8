"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { updateProfileAction } from "@/lib/actions/profile.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { DocumentUploadField } from "@/components/shared/document-upload-field";
import { NIGERIA_STATES } from "@/lib/data/nigeria-locations";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

interface ProfileEditUser {
  role: string;
  profileImageUrl: string | null;
  profileDescription: string | null;
  organization: string | null;
  state: string | null;
  localGovt: string | null;
  address: string | null;
  specialization: string | null;
  qualification: string | null;
  experience: string | null;
  travel: boolean;
  cvUrl: string | null;
  certificateUrl: string | null;
}

export function ProfileEditForm({
  user,
  skills,
  selectedSkillIds,
}: {
  user: ProfileEditUser;
  skills: { id: string; name: string }[];
  selectedSkillIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [selectedState, setSelectedState] = useState(user.state ?? "");

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <ImageUploadField
        name="profileImageUrl"
        label={user.role === "EVENT_MANAGER" ? "Company logo" : "Profile picture"}
        defaultUrl={user.profileImageUrl}
        shape={user.role === "EVENT_MANAGER" ? "square" : "circle"}
      />

      <div className="space-y-2">
        <Label htmlFor="profileDescription">
          {user.role === "EVENT_MANAGER" ? "About your organization" : "About you"}
        </Label>
        <Textarea
          id="profileDescription"
          name="profileDescription"
          rows={3}
          maxLength={1000}
          defaultValue={user.profileDescription ?? ""}
        />
        {state.fieldErrors?.profileDescription && (
          <p className="text-sm text-destructive">{state.fieldErrors.profileDescription}</p>
        )}
      </div>

      {user.role === "EVENT_MANAGER" && (
        <div className="space-y-2">
          <Label htmlFor="organization">Organization</Label>
          <Input id="organization" name="organization" defaultValue={user.organization ?? ""} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            name="state"
            defaultValue={user.state ?? ""}
            className={nativeSelectClassName}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="">Select your state</option>
            {NIGERIA_STATES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="localGovt">Local Government</Label>
          <select
            key={selectedState}
            id="localGovt"
            name="localGovt"
            defaultValue={user.localGovt ?? ""}
            disabled={!selectedState}
            className={nativeSelectClassName}
          >
            <option value="">{selectedState ? "Select your LGA" : "Select a state first"}</option>
            {NIGERIA_STATES.find((s) => s.name === selectedState)?.lgas.map((lga) => (
              <option key={lga} value={lga}>
                {lga}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Street address" defaultValue={user.address ?? ""} />
      </div>

      {user.role === "FACILITATOR" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input id="specialization" name="specialization" defaultValue={user.specialization ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input id="qualification" name="qualification" defaultValue={user.qualification ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Input id="experience" name="experience" defaultValue={user.experience ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="travel"
              defaultChecked={user.travel}
              className="size-4 rounded border-input"
            />
            Willing to travel for training assignments
          </label>

          {skills.length > 0 && (
            <div className="space-y-2">
              <Label>Facilitating skills</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} className="rounded-lg border border-input p-3">
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
            </div>
          )}

          <DocumentUploadField name="cvUrl" label="CV / résumé (PDF)" defaultUrl={user.cvUrl} />
          <DocumentUploadField name="certificateUrl" label="Certificate (PDF)" defaultUrl={user.certificateUrl} />
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        <Link href="/profile" className="text-sm text-muted-foreground underline underline-offset-4">
          Cancel
        </Link>
      </div>
    </form>
  );
}
