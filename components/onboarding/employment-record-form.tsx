"use client";

import { useActionState, useEffect, useState } from "react";

import { addEmploymentHistoryAction, editEmploymentHistoryAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/data/onboarding-options";
import type { EmploymentRecord } from "@/components/onboarding/employment-history-section";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export function EmploymentRecordForm({
  record,
  onDone,
  onCancel,
}: {
  record: EmploymentRecord | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const action = record ? editEmploymentHistoryAction.bind(null, record.id) : addEmploymentHistoryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isCurrent, setIsCurrent] = useState(record?.isCurrent ?? false);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-input p-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="companyName">Company</Label>
          <Input id="companyName" name="companyName" defaultValue={record?.companyName ?? ""} required />
          {state.fieldErrors?.companyName && (
            <p className="text-sm text-destructive">{state.fieldErrors.companyName}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" name="jobTitle" defaultValue={record?.jobTitle ?? ""} required />
          {state.fieldErrors?.jobTitle && <p className="text-sm text-destructive">{state.fieldErrors.jobTitle}</p>}
        </div>
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" defaultValue={record?.industry ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="employmentType">Employment type</Label>
          <select
            id="employmentType"
            name="employmentType"
            defaultValue={record?.employmentType ?? "FULL_TIME"}
            className={nativeSelectClassName}
          >
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={record?.location ?? ""} />
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(record?.startDate ?? null)}
            required
          />
          {state.fieldErrors?.startDate && <p className="text-sm text-destructive">{state.fieldErrors.startDate}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(record?.endDate ?? null)}
            disabled={isCurrent}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isCurrent"
          checked={isCurrent}
          onChange={(e) => setIsCurrent(e.target.checked)}
          className="size-4 rounded border-input"
        />
        I currently work here
      </label>

      <div className="space-y-1">
        <Label htmlFor="responsibilities">Responsibilities</Label>
        <Textarea
          id="responsibilities"
          name="responsibilities"
          rows={2}
          defaultValue={record?.responsibilities ?? ""}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="achievements">Key achievements</Label>
        <Textarea id="achievements" name="achievements" rows={2} defaultValue={record?.achievements ?? ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="skillsDeveloped">Skills developed (comma-separated)</Label>
        <Input
          id="skillsDeveloped"
          name="skillsDeveloped"
          defaultValue={(record?.skillsDeveloped ?? []).join(", ")}
        />
      </div>

      <div className="grid !grid-cols-2 !gap-3">
        <div className="space-y-1">
          <Label htmlFor="majorProjects">Major projects</Label>
          <Input id="majorProjects" name="majorProjects" defaultValue={record?.majorProjects ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="teamSize">Team size managed</Label>
          <Input id="teamSize" name="teamSize" type="number" min={0} defaultValue={record?.teamSize ?? ""} />
        </div>
      </div>

      {!isCurrent && (
        <div className="space-y-1">
          <Label htmlFor="reasonForLeaving">Reason for leaving</Label>
          <Input id="reasonForLeaving" name="reasonForLeaving" defaultValue={record?.reasonForLeaving ?? ""} />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : record ? "Save changes" : "Add record"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
