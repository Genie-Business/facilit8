"use client";

import { useActionState, useState } from "react";

import { updateMarketingPageContentAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import type { HomeContent } from "@/lib/validation/content";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ItemListEditor } from "./item-list-editor";

const initialState: ActionState = {};

export function HomeContentForm({ initial }: { initial: HomeContent }) {
  const [content, setContent] = useState(initial);
  const [state, formAction, pending] = useActionState(updateMarketingPageContentAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="page" value="home" />
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

      <div className="space-y-2 rounded-lg border border-input p-3">
        <Label>Hero</Label>
        <Input
          value={content.hero.badge}
          onChange={(e) => setContent({ ...content, hero: { ...content.hero, badge: e.target.value } })}
          placeholder="Badge text"
        />
        <Input
          value={content.hero.headlineBefore}
          onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineBefore: e.target.value } })}
          placeholder="Headline, before the highlighted part"
        />
        <Input
          value={content.hero.headlineHighlight}
          onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineHighlight: e.target.value } })}
          placeholder="Highlighted part of the headline"
        />
        <Textarea
          rows={2}
          value={content.hero.subhead}
          onChange={(e) => setContent({ ...content, hero: { ...content.hero, subhead: e.target.value } })}
          placeholder="Subhead"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="home-audiences-eyebrow">Audiences section eyebrow</Label>
          <Input
            id="home-audiences-eyebrow"
            value={content.audiencesEyebrow}
            onChange={(e) => setContent({ ...content, audiencesEyebrow: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="home-audiences-title">Audiences section title</Label>
          <Input
            id="home-audiences-title"
            value={content.audiencesTitle}
            onChange={(e) => setContent({ ...content, audiencesTitle: e.target.value })}
          />
        </div>
      </div>
      <ItemListEditor
        label="Audience cards"
        fields={[
          { key: "icon", label: "Icon", type: "icon" },
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ]}
        items={content.audiences}
        onChange={(v) => setContent({ ...content, audiences: v as HomeContent["audiences"] })}
        blankItem={{ icon: "Building2", eyebrow: "", title: "", body: "" }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="home-services-eyebrow">Services section eyebrow</Label>
          <Input
            id="home-services-eyebrow"
            value={content.servicesEyebrow}
            onChange={(e) => setContent({ ...content, servicesEyebrow: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="home-services-title">Services section title</Label>
          <Input
            id="home-services-title"
            value={content.servicesTitle}
            onChange={(e) => setContent({ ...content, servicesTitle: e.target.value })}
          />
        </div>
      </div>
      <ItemListEditor
        label="Service cards"
        fields={[
          { key: "icon", label: "Icon", type: "icon" },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ]}
        items={content.services}
        onChange={(v) => setContent({ ...content, services: v as HomeContent["services"] })}
        blankItem={{ icon: "Sparkles", title: "", body: "" }}
      />

      <div className="space-y-2 rounded-lg border border-input p-3">
        <Label>Mission section</Label>
        <Input
          value={content.missionEyebrow}
          onChange={(e) => setContent({ ...content, missionEyebrow: e.target.value })}
          placeholder="Eyebrow"
        />
        <Input
          value={content.missionTitle}
          onChange={(e) => setContent({ ...content, missionTitle: e.target.value })}
          placeholder="Title"
        />
        <Textarea
          rows={4}
          value={content.missionBody}
          onChange={(e) => setContent({ ...content, missionBody: e.target.value })}
          placeholder="Body"
        />
      </div>

      <div className="space-y-2 rounded-lg border border-input p-3">
        <Label>Awé section</Label>
        <Input
          value={content.awe.badge}
          onChange={(e) => setContent({ ...content, awe: { ...content.awe, badge: e.target.value } })}
          placeholder="Badge"
        />
        <Input
          value={content.awe.title}
          onChange={(e) => setContent({ ...content, awe: { ...content.awe, title: e.target.value } })}
          placeholder="Title"
        />
        <Textarea
          rows={2}
          value={content.awe.body}
          onChange={(e) => setContent({ ...content, awe: { ...content.awe, body: e.target.value } })}
          placeholder="Body"
        />
        <Label>Bullets</Label>
        {content.awe.bullets.map((bullet, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={bullet}
              onChange={(e) => {
                const bullets = content.awe.bullets.map((b, idx) => (idx === i ? e.target.value : b));
                setContent({ ...content, awe: { ...content.awe, bullets } });
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setContent({
                  ...content,
                  awe: { ...content.awe, bullets: content.awe.bullets.filter((_, idx) => idx !== i) },
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setContent({ ...content, awe: { ...content.awe, bullets: [...content.awe.bullets, ""] } })}
        >
          Add bullet
        </Button>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Home page"}
      </Button>
    </form>
  );
}
