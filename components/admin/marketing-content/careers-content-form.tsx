"use client";

import { useActionState, useState } from "react";

import { updateMarketingPageContentAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import type { CareersContent } from "@/lib/validation/content";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HeroFields } from "./hero-fields";

const initialState: ActionState = {};

export function CareersContentForm({ initial }: { initial: CareersContent }) {
  const [content, setContent] = useState(initial);
  const [state, formAction, pending] = useActionState(updateMarketingPageContentAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="page" value="careers" />
      <input type="hidden" name="blocks" value={JSON.stringify(content)} />

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

      <HeroFields idPrefix="careers-hero" value={content.hero} onChange={(hero) => setContent({ ...content, hero })} />

      <div className="space-y-1">
        <Label htmlFor="careers-body">Body</Label>
        <Textarea
          id="careers-body"
          rows={4}
          value={content.body}
          onChange={(e) => setContent({ ...content, body: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Careers page"}
      </Button>
    </form>
  );
}
