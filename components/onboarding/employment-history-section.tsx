"use client";

import { useState } from "react";

import { EmploymentRecordForm } from "@/components/onboarding/employment-record-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteEmploymentHistoryAction } from "@/lib/actions/onboarding.actions";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/data/onboarding-options";

export interface EmploymentRecord {
  id: string;
  companyName: string;
  jobTitle: string;
  industry: string | null;
  employmentType: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string | null;
  achievements: string | null;
  skillsDeveloped: string[];
  majorProjects: string | null;
  teamSize: number | null;
  reasonForLeaving: string | null;
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function EmploymentHistorySection({ records }: { records: EmploymentRecord[] }) {
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Label>Employment History</Label>
      {records.map((record) =>
        editingId === record.id ? (
          <EmploymentRecordForm
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
                {record.jobTitle} · {record.companyName}
              </p>
              <p className="text-xs text-muted-foreground">
                {EMPLOYMENT_TYPE_LABELS[record.employmentType] ?? record.employmentType} ·{" "}
                {formatMonthYear(record.startDate)} –{" "}
                {record.isCurrent ? "Present" : record.endDate ? formatMonthYear(record.endDate) : "N/A"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(record.id)}>
                Edit
              </Button>
              <form action={deleteEmploymentHistoryAction.bind(null, record.id)}>
                <Button type="submit" size="sm" variant="destructive">
                  Remove
                </Button>
              </form>
            </div>
          </div>
        )
      )}

      {addingNew ? (
        <EmploymentRecordForm
          record={null}
          onDone={() => setAddingNew(false)}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingNew(true)}>
          + Add employment record
        </Button>
      )}
    </div>
  );
}
