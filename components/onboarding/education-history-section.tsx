"use client";

import { useState } from "react";

import { EducationRecordForm } from "@/components/onboarding/education-record-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteEducationHistoryAction } from "@/lib/actions/onboarding.actions";

export interface EducationRecord {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  grade: string | null;
  relevantCoursework: string | null;
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function EducationHistorySection({ records }: { records: EducationRecord[] }) {
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Label>Education History</Label>
      {records.map((record) =>
        editingId === record.id ? (
          <EducationRecordForm
            key={record.id}
            record={record}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={record.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-input p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {record.qualification} · {record.institution}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatMonthYear(record.startDate)} – {record.endDate ? formatMonthYear(record.endDate) : "—"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(record.id)}>
                Edit
              </Button>
              <form action={deleteEducationHistoryAction.bind(null, record.id)}>
                <Button type="submit" size="sm" variant="destructive">
                  Remove
                </Button>
              </form>
            </div>
          </div>
        )
      )}

      {addingNew ? (
        <EducationRecordForm
          record={null}
          onDone={() => setAddingNew(false)}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingNew(true)}>
          + Add education record
        </Button>
      )}
    </div>
  );
}
