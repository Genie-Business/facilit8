"use client";

import { useActionState } from "react";

import { updateLegalPageAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function LegalPageForm({
  slug,
  title,
  contentHtml,
}: {
  slug: "privacy" | "terms";
  title: string;
  contentHtml: string;
}) {
  const [state, formAction, pending] = useActionState(updateLegalPageAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-2">
        <Label htmlFor={`${slug}-title`}>Title</Label>
        <Input id={`${slug}-title`} name="title" defaultValue={title} required />
        {state.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${slug}-content`}>Content (HTML)</Label>
        <Textarea id={`${slug}-content`} name="contentHtml" defaultValue={contentHtml} rows={16} required />
        {state.fieldErrors?.contentHtml && (
          <p className="text-sm text-destructive">{state.fieldErrors.contentHtml}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
