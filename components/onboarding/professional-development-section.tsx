"use client";

import { useState } from "react";

import { ProfessionalDevelopmentForm } from "@/components/onboarding/professional-development-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteProfessionalDevelopmentAction } from "@/lib/actions/onboarding.actions";
import { PROFESSIONAL_DEVELOPMENT_TYPE_LABELS } from "@/lib/data/onboarding-options";

export interface ProfessionalDevelopmentRecord {
  id: string;
  type: string;
  title: string;
  provider: string | null;
  dateCompleted: string;
  skillsAcquired: string[];
  expiryDate: string | null;
  source: "MANUAL" | "FACILIT8_AUTO";
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ProfessionalDevelopmentSection({ records }: { records: ProfessionalDevelopmentRecord[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="space-y-3">
      <Label>Professional Development</Label>
      <p className="text-xs text-muted-foreground">
        Courses, certifications, and workshops, including training outside Facilit8. Trainings you complete on
        Facilit8 will show up here automatically once they're delivered.
      </p>

      {records.map((record) => (
        <div key={record.id} className="flex items-start justify-between gap-3 rounded-lg border border-input p-3">
          <div>
            <p className="text-sm font-medium">
              {record.title}
              {record.source === "FACILIT8_AUTO" && (
                <Badge variant="secondary" className="ml-2">
                  Facilit8
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {PROFESSIONAL_DEVELOPMENT_TYPE_LABELS[record.type] ?? record.type}
              {record.provider ? ` · ${record.provider}` : ""} · {formatMonthYear(record.dateCompleted)}
            </p>
          </div>
          {record.source === "MANUAL" && (
            <form action={deleteProfessionalDevelopmentAction.bind(null, record.id)}>
              <Button type="submit" size="sm" variant="destructive">
                Remove
              </Button>
            </form>
          )}
        </div>
      ))}

      {addingNew ? (
        <ProfessionalDevelopmentForm onDone={() => setAddingNew(false)} onCancel={() => setAddingNew(false)} />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingNew(true)}>
          + Add training record
        </Button>
      )}
    </div>
  );
}
