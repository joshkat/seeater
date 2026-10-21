import { createEventDoc, createEventFromTemplate, findTemplate } from "@seating/shared";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { requestPersistentStorage } from "../../../lib/persistentStorage";
import { createEvent } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";
import { TemplatePicker } from "../../templates/components/TemplatePicker";
import { SampleEventButton } from "./SampleEventButton";

/** "New event": a name, and a blank room or a starter template. */
export function NewEventDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const template = templateId ? findTemplate(templateId) : undefined;
      const doc = template
        ? createEventFromTemplate(template, trimmed)
        : createEventDoc({ name: trimmed });
      await createEvent(activeDb(), doc);
      void requestPersistentStorage();
      navigate(`/events/${doc.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-label="New event"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-5 text-base-content shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleCreate}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <h3 className="text-base font-semibold">New event</h3>
        <input
          autoFocus
          aria-label="Event name"
          className="input input-bordered input-sm w-full"
          placeholder="e.g. Sarah & Tom's Wedding"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <span className="text-xs font-semibold text-base-content/70">Start from</span>
        <TemplatePicker value={templateId} onChange={setTemplateId} />
        <div className="flex justify-end gap-2">
          <SampleEventButton className="btn btn-ghost btn-sm mr-auto" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={busy || name.trim() === ""}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
