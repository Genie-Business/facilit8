import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface HeroValue {
  eyebrow: string;
  title: string;
  description: string;
}

export function HeroFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: HeroValue;
  onChange: (value: HeroValue) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-input p-3">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-eyebrow`}>Eyebrow</Label>
        <Input
          id={`${idPrefix}-eyebrow`}
          value={value.eyebrow}
          onChange={(e) => onChange({ ...value, eyebrow: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={2}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>
    </div>
  );
}
