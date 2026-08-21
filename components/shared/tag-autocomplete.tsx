"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";

export interface TagOption {
  id: string;
  name: string;
}

/**
 * Type-to-filter multi-select with inline "create new" support. Two submission shapes to
 * match the two existing form contracts it replaces: "multiple" renders one hidden input
 * per selection (skillIds, as the checkbox grid it replaces already did — no server-action
 * changes needed), "csv" renders one comma-joined hidden input (languagesSpoken, matching
 * its existing tagList schema transform).
 */
export function TagAutocomplete({
  name,
  label,
  suggestions,
  initialSelected,
  submitMode,
  onCreateNew,
  placeholder,
}: {
  name: string;
  label?: string;
  suggestions: TagOption[];
  initialSelected: TagOption[];
  submitMode: "multiple" | "csv";
  onCreateNew?: (name: string) => Promise<TagOption | null>;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<TagOption[]>(initialSelected);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = suggestions
    .filter((s) => !selected.some((sel) => sel.id === s.id))
    .filter((s) => s.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
  const exactMatch =
    normalizedQuery.length > 0 &&
    (suggestions.some((s) => s.name.toLowerCase() === normalizedQuery) ||
      selected.some((s) => s.name.toLowerCase() === normalizedQuery));
  const showCreateRow = normalizedQuery.length > 0 && !exactMatch;

  function addOption(option: TagOption) {
    setSelected((prev) => [...prev, option]);
    setQuery("");
    setOpen(false);
  }

  function removeOption(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleCreate() {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (!onCreateNew) {
      addOption({ id: trimmed, name: trimmed });
      return;
    }

    setCreating(true);
    try {
      const created = await onCreateNew(trimmed);
      if (created) addOption(created);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              {option.name}
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${option.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Input
        value={query}
        placeholder={placeholder ?? "Type to search or add..."}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) addOption(filtered[0]);
            else if (showCreateRow) handleCreate();
          }
        }}
      />

      {open && (filtered.length > 0 || showCreateRow) && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-input bg-popover py-1 shadow-md">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => addOption(option)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {option.name}
            </button>
          ))}
          {showCreateRow && (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="block w-full px-3 py-1.5 text-left text-sm text-brand hover:bg-muted disabled:opacity-50"
            >
              {creating ? "Adding..." : `+ Add "${query.trim()}"`}
            </button>
          )}
        </div>
      )}

      {submitMode === "multiple"
        ? selected.map((option) => <input key={option.id} type="hidden" name={name} value={option.id} />)
        : <input type="hidden" name={name} value={selected.map((s) => s.name).join(", ")} />}
    </div>
  );
}
