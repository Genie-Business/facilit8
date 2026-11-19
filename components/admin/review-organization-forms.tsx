"use client";

import { useActionState } from "react";

import {
  approveOrganizationAction,
  rejectOrganizationAction,
  rejectOrganizationDocumentAction,
} from "@/lib/actions/admin-organization.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function ApproveOrganizationForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(approveOrganizationAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Approving..." : "Approve organization"}
      </Button>
    </form>
  );
}

/** One reason box, used both to send a single document back and to turn the whole organization down. */
export function RejectWithReasonForm({
  idField,
  id,
  action,
  placeholder,
  buttonLabel,
}: {
  idField: "organizationId" | "documentId";
  id: string;
  action: "document" | "organization";
  placeholder: string;
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action === "document" ? rejectOrganizationDocumentAction : rejectOrganizationAction,
    initialState
  );

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name={idField} value={id} />
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Textarea name="reason" placeholder={placeholder} rows={2} maxLength={500} required />
      {state.fieldErrors?.reason && <p className="text-sm text-destructive">{state.fieldErrors.reason}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Sending..." : buttonLabel}
      </Button>
    </form>
  );
}
