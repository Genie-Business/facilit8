"use client";

import { useState } from "react";

import { OrganizationTrainingHistoryForm } from "@/components/onboarding/organization-training-history-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteOrganizationTrainingHistoryAction } from "@/lib/actions/onboarding.actions";

export interface OrganizationTrainingHistoryRecord {
  id: string;
  title: string;
  provider: string | null;
  dateCompleted: string;
  notes: string | null;
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function OrganizationTrainingHistorySection({ records }: { records: OrganizationTrainingHistoryRecord[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="space-y-3">
      <Label>Trainings run for your staff</Label>
      <p className="text-xs text-muted-foreground">
        Training your organization has already run for its team, including anything run outside Facilit8.
      </p>

      {records.map((record) => (
        <div key={record.id} className="flex items-start justify-between gap-3 rounded-lg border border-input p-3">
          <div>
            <p className="text-sm font-medium">{record.title}</p>
            <p className="text-xs text-muted-foreground">
              {record.provider ? `${record.provider} · ` : ""}
              {formatMonthYear(record.dateCompleted)}
            </p>
          </div>
          <form action={deleteOrganizationTrainingHistoryAction.bind(null, record.id)}>
            <Button type="submit" size="sm" variant="destructive">
              Remove
            </Button>
          </form>
        </div>
      ))}

      {addingNew ? (
        <OrganizationTrainingHistoryForm onDone={() => setAddingNew(false)} onCancel={() => setAddingNew(false)} />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingNew(true)}>
          + Add training record
        </Button>
      )}
    </div>
  );
}
