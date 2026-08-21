"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MARKETING_ICON_NAMES } from "@/lib/data/marketing-icons";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface ItemField {
  key: string;
  label: string;
  type: "text" | "textarea" | "icon";
}

/** Generic repeatable-row editor for the {icon?, eyebrow?, title, body} card/step shapes
 * that recur across every marketing page — one component instead of three near-identical
 * ones for cards, steps, and audience tiles. */
export function ItemListEditor({
  label,
  fields,
  items,
  onChange,
  blankItem,
}: {
  label: string;
  fields: ItemField[];
  items: Record<string, string>[];
  onChange: (items: Record<string, string>[]) => void;
  blankItem: Record<string, string>;
}) {
  function updateItem(index: number, key: string, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-input p-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`item-${label}-${index}-${field.key}`}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`item-${label}-${index}-${field.key}`}
                  rows={2}
                  value={item[field.key] ?? ""}
                  onChange={(e) => updateItem(index, field.key, e.target.value)}
                />
              ) : field.type === "icon" ? (
                <select
                  id={`item-${label}-${index}-${field.key}`}
                  className={nativeSelectClassName}
                  value={item[field.key] ?? MARKETING_ICON_NAMES[0]}
                  onChange={(e) => updateItem(index, field.key, e.target.value)}
                >
                  {MARKETING_ICON_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`item-${label}-${index}-${field.key}`}
                  value={item[field.key] ?? ""}
                  onChange={(e) => updateItem(index, field.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(index)}>
            <Trash2 />
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, blankItem])}>
        <Plus />
        Add
      </Button>
    </div>
  );
}
