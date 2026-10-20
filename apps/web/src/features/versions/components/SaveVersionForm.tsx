import { type FormEvent, useState } from "react";

/** "Name this version" + Save. */
export function SaveVersionForm({
  onSave,
}: {
  onSave: (label: string) => Promise<void>;
}): JSX.Element {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(label);
      setLabel("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="join w-full">
      <input
        className="input join-item input-sm w-full text-base-content"
        aria-label="Version name"
        placeholder="Name this version, e.g. “Before seating the families”"
        maxLength={80}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <button type="submit" className="btn btn-primary join-item btn-sm" disabled={saving}>
        Save version
      </button>
    </form>
  );
}
