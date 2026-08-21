"use client";

import { useActionState, useState } from "react";

import { updateMarketingPageContentAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import type { ServicesContent } from "@/lib/validation/content";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HeroFields } from "./hero-fields";
import { ItemListEditor } from "./item-list-editor";

const initialState: ActionState = {};

const STEP_FIELDS = [
  { key: "title", label: "Title", type: "text" as const },
  { key: "body", label: "Body", type: "textarea" as const },
];
const BLANK_STEP = { title: "", body: "" };

function CalloutFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { title: string; body: string };
  onChange: (value: { title: string; body: string }) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-input p-3">
      <Label>{label}</Label>
      <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Title" />
      <Textarea rows={3} value={value.body} onChange={(e) => onChange({ ...value, body: e.target.value })} placeholder="Body" />
    </div>
  );
}

export function ServicesContentForm({ initial }: { initial: ServicesContent }) {
  const [content, setContent] = useState(initial);
  const [state, formAction, pending] = useActionState(updateMarketingPageContentAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="page" value="services" />
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

      <HeroFields idPrefix="services-hero" value={content.hero} onChange={(hero) => setContent({ ...content, hero })} />

      <ItemListEditor
        label="Event Manager steps"
        fields={STEP_FIELDS}
        items={content.eventManagerSteps}
        onChange={(v) => setContent({ ...content, eventManagerSteps: v as ServicesContent["eventManagerSteps"] })}
        blankItem={BLANK_STEP}
      />
      <ItemListEditor
        label="Facilitator steps"
        fields={STEP_FIELDS}
        items={content.facilitatorSteps}
        onChange={(v) => setContent({ ...content, facilitatorSteps: v as ServicesContent["facilitatorSteps"] })}
        blankItem={BLANK_STEP}
      />
      <ItemListEditor
        label="Professional steps"
        fields={STEP_FIELDS}
        items={content.professionalSteps}
        onChange={(v) => setContent({ ...content, professionalSteps: v as ServicesContent["professionalSteps"] })}
        blankItem={BLANK_STEP}
      />
      <ItemListEditor
        label="Platform features"
        fields={[
          { key: "icon", label: "Icon", type: "icon" },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ]}
        items={content.platformFeatures}
        onChange={(v) => setContent({ ...content, platformFeatures: v as ServicesContent["platformFeatures"] })}
        blankItem={{ icon: "Wallet", title: "", body: "" }}
      />

      <CalloutFields
        label="Merged training callout"
        value={content.mergedTrainingCallout}
        onChange={(v) => setContent({ ...content, mergedTrainingCallout: v })}
      />
      <CalloutFields
        label="Awé callout"
        value={content.aweCallout}
        onChange={(v) => setContent({ ...content, aweCallout: v })}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Services page"}
      </Button>
    </form>
  );
}
