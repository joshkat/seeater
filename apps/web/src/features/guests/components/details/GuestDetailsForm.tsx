import type { Guest, GuestPatch, RsvpStatus } from "@seating/shared";
import { mealOptions, tagOptions } from "@seating/shared";
import { type FormEvent, useId, useMemo, useState } from "react";

import { shortcutLabel } from "../../../../lib/platform";
import { useDocumentStore } from "../../../editor/store/documentStore";
import { useGuestStore } from "../../store/guestStore";
import { useSeatingFlowStore } from "../../store/seatingFlowStore";
import { RsvpControl } from "../RsvpControl";
import { TagInput } from "./TagInput";

interface GuestDetailsFormProps {
  guest: Guest;
  onClose: () => void;
}

const labelClass = "mb-1 block text-xs font-semibold text-base-content/70";
const inputClass = "input input-sm w-full";

/** Everything about one guest. Save applies it as one (undoable) change. */
export function GuestDetailsForm({ guest, onClose }: GuestDetailsFormProps): JSX.Element {
  const doc = useDocumentStore((state) => state.doc);
  const editGuest = useGuestStore((state) => state.editGuest);
  const removeGuest = useGuestStore((state) => state.removeGuest);
  const mealListId = useId();

  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email ?? "");
  const [phone, setPhone] = useState(guest.phone ?? "");
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(guest.rsvpStatus);
  const [meal, setMeal] = useState(guest.meal ?? "");
  const [dietary, setDietary] = useState(guest.dietary ?? "");
  const [accessibility, setAccessibility] = useState(guest.accessibility ?? "");
  const [isChild, setIsChild] = useState(guest.isChild);
  const [tags, setTags] = useState(guest.tags);
  const [notes, setNotes] = useState(guest.notes ?? "");

  const meals = useMemo(() => (doc ? mealOptions(doc) : []), [doc]);
  const allTags = useMemo(() => (doc ? tagOptions(doc) : []), [doc]);
  const household = doc?.households.find((candidate) => candidate.id === guest.householdId);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const patch: GuestPatch = {
      name,
      email,
      phone,
      rsvpStatus,
      meal,
      dietary,
      accessibility,
      isChild,
      tags,
      notes,
    };
    editGuest(guest.id, patch);
    onClose();
  }

  function handleDelete(): void {
    removeGuest(guest.id);
    onClose();
    useSeatingFlowStore
      .getState()
      .showNotice(`Deleted ${guest.name}. Undo with ${shortcutLabel("Z")}.`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Guest details</h2>
          {household && (
            <p className="text-xs text-base-content/60">Part of the {household.name} household</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          className="btn btn-ghost btn-sm btn-square"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div>
        <label className={labelClass} htmlFor="guest-name">
          Name
        </label>
        <input
          id="guest-name"
          required
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="guest-email">
            Email
          </label>
          <input
            id="guest-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="guest-phone">
            Phone
          </label>
          <input
            id="guest-phone"
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className={labelClass}>RSVP</span>
          <RsvpControl status={rsvpStatus} onChange={setRsvpStatus} />
        </div>
        <label className="label cursor-pointer gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={isChild}
            onChange={(event) => setIsChild(event.target.checked)}
          />
          Child
        </label>
      </div>

      <div>
        <label className={labelClass} htmlFor="guest-meal">
          Meal
        </label>
        <input
          id="guest-meal"
          list={mealListId}
          placeholder={meals.length > 0 ? `e.g. ${meals.slice(0, 3).join(", ")}` : "e.g. Chicken"}
          className={inputClass}
          value={meal}
          onChange={(event) => setMeal(event.target.value)}
        />
        <datalist id={mealListId}>
          {meals.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="guest-dietary">
            Dietary needs &amp; allergies
          </label>
          <input
            id="guest-dietary"
            placeholder="e.g. Nut allergy"
            className={inputClass}
            value={dietary}
            onChange={(event) => setDietary(event.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="guest-accessibility">
            Accessibility needs
          </label>
          <input
            id="guest-accessibility"
            placeholder="e.g. Wheelchair, near the exit"
            className={inputClass}
            value={accessibility}
            onChange={(event) => setAccessibility(event.target.value)}
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Tags</span>
        <TagInput tags={tags} suggestions={allTags} onChange={setTags} />
      </div>

      <div>
        <label className={labelClass} htmlFor="guest-notes">
          Notes
        </label>
        <textarea
          id="guest-notes"
          rows={3}
          className="textarea textarea-sm w-full"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="modal-action mt-1 items-center">
        <button
          type="button"
          className="btn btn-ghost btn-sm mr-auto text-error"
          onClick={handleDelete}
        >
          Delete guest
        </button>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          Save
        </button>
      </div>
    </form>
  );
}
