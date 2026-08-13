"use client";

import { useActionState, useEffect } from "react";

import { addEducationHistoryAction, editEducationHistoryAction } from "@/lib/actions/onboarding.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EducationRecord } from "@/components/onboarding/education-history-section";

const initialState: ActionState = {};

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export function EducationRecordForm({
  record,
  onDone,
  onCancel,
}: {
  record: EducationRecord | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const action = record ? editEducationHistoryAction.bind(null, record.id) : addEducationHistoryAction;
  const [state, formAction, pending] = useActionState(action, initialState);

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="institution">Institution</Label>
          <Input id="institution" name="institution" defaultValue={record?.institution ?? ""} required />
          {state.fieldErrors?.institution && (
            <p className="text-sm text-destructive">{state.fieldErrors.institution}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="qualification">Qualification</Label>
          <Input id="qualification" name="qualification" defaultValue={record?.qualification ?? ""} required />
          {state.fieldErrors?.qualification && (
            <p className="text-sm text-destructive">{state.fieldErrors.qualification}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fieldOfStudy">Field of study</Label>
        <Input id="fieldOfStudy" name="fieldOfStudy" defaultValue={record?.fieldOfStudy ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(record?.endDate ?? null)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="grade">Grade</Label>
        <Input id="grade" name="grade" defaultValue={record?.grade ?? ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="relevantCoursework">Relevant coursework</Label>
        <Textarea
          id="relevantCoursework"
          name="relevantCoursework"
          rows={2}
          defaultValue={record?.relevantCoursework ?? ""}
        />
      </div>

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
