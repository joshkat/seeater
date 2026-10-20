import { type KeyboardEvent, useId, useState } from "react";

interface TagInputProps {
  tags: string[];
  /** Tags used elsewhere in the event, offered as suggestions. */
  suggestions: string[];
  onChange: (tags: string[]) => void;
}

/** Chips for a guest's tags: type and press Enter (or a comma) to add, × to remove. */
export function TagInput({ tags, suggestions, onChange }: TagInputProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (value: string): void => {
    const tag = value.trim();
    if (tag && !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      onChange([...tags, tag]);
    }
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-field border border-base-300 p-1.5">
      {tags.map((tag) => (
        <span key={tag} className="badge badge-primary badge-soft gap-1">
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onChange(tags.filter((existing) => existing !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        list={listId}
        aria-label="Add a tag"
        placeholder={tags.length === 0 ? "e.g. Bride's side, Family, Work" : "Add a tag"}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add(draft)}
      />
      <datalist id={listId}>
        {suggestions
          .filter((suggestion) => !tags.includes(suggestion))
          .map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    </div>
  );
}
