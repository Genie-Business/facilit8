"use client";

import { useActionState, useState } from "react";

import { updateMarketingPageContentAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import type { AboutContent } from "@/lib/validation/content";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HeroFields } from "./hero-fields";
import { ItemListEditor } from "./item-list-editor";

const initialState: ActionState = {};

export function AboutContentForm({ initial }: { initial: AboutContent }) {
  const [content, setContent] = useState(initial);
  const [state, formAction, pending] = useActionState(updateMarketingPageContentAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="page" value="about" />
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

      <HeroFields idPrefix="about-hero" value={content.hero} onChange={(hero) => setContent({ ...content, hero })} />

      <div className="space-y-1">
        <Label htmlFor="about-mission-heading">Mission heading</Label>
        <Input
          id="about-mission-heading"
          value={content.missionHeading}
          onChange={(e) => setContent({ ...content, missionHeading: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="about-mission-lead">Mission lead line</Label>
        <Textarea
          id="about-mission-lead"
          rows={2}
          value={content.missionLead}
          onChange={(e) => setContent({ ...content, missionLead: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="about-mission-body">Mission body</Label>
        <Textarea
          id="about-mission-body"
          rows={4}
          value={content.missionBody}
          onChange={(e) => setContent({ ...content, missionBody: e.target.value })}
        />
      </div>

      <ItemListEditor
        label="Values"
        fields={[
          { key: "icon", label: "Icon", type: "icon" },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ]}
        items={content.values}
        onChange={(values) => setContent({ ...content, values: values as AboutContent["values"] })}
        blankItem={{ icon: "Users", title: "", body: "" }}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save About page"}
      </Button>
    </form>
  );
}
