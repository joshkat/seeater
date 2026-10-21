import { mealOptions, tagOptions } from "@seating/shared";
import { useMemo } from "react";

import { useDocumentStore } from "../../../editor/store/documentStore";
import { activeFilterCount } from "../../lib/guestFilter";
import { useGuestFilterStore } from "../../store/guestFilterStore";

const selectClass = "select select-sm w-full";
const labelClass = "mb-0.5 block text-xs font-semibold text-base-content/70";

/** "Filters" dropdown: RSVP, seated or not, tag, meal, needs. */
export function GuestFilterMenu(): JSX.Element {
  const doc = useDocumentStore((state) => state.doc);
  const filter = useGuestFilterStore((state) => state.filter);
  const setFilter = useGuestFilterStore((state) => state.setFilter);
  const tags = useMemo(() => (doc ? tagOptions(doc) : []), [doc]);
  const meals = useMemo(() => (doc ? mealOptions(doc) : []), [doc]);
  const count = activeFilterCount(filter);

  return (
    <div className="dropdown dropdown-end">
      <button type="button" tabIndex={0} className={`btn btn-sm ${count > 0 ? "btn-primary" : ""}`}>
        Filters{count > 0 && <span className="badge badge-sm">{count}</span>}
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-20 mt-1 flex w-64 flex-col gap-2 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg"
      >
        <label>
          <span className={labelClass}>RSVP</span>
          <select
            className={selectClass}
            value={filter.rsvp}
            onChange={(event) => setFilter({ rsvp: event.target.value as typeof filter.rsvp })}
          >
            <option value="any">Any</option>
            <option value="accepted">Going</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Seating</span>
          <select
            className={selectClass}
            value={filter.seating}
            onChange={(event) =>
              setFilter({ seating: event.target.value as typeof filter.seating })
            }
          >
            <option value="any">Any</option>
            <option value="seated">Seated</option>
            <option value="unseated">Not seated yet</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Tag</span>
          <select
            className={selectClass}
            value={filter.tag ?? ""}
            onChange={(event) => setFilter({ tag: event.target.value || null })}
          >
            <option value="">Any</option>
            {tags.map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Meal</span>
          <select
            className={selectClass}
            value={filter.meal ?? ""}
            onChange={(event) => setFilter({ meal: event.target.value || null })}
          >
            <option value="">Any</option>
            {meals.map((meal) => (
              <option key={meal}>{meal}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Needs</span>
          <select
            className={selectClass}
            value={filter.need}
            onChange={(event) => setFilter({ need: event.target.value as typeof filter.need })}
          >
            <option value="any">Any</option>
            <option value="dietary">Dietary needs / allergies</option>
            <option value="accessibility">Accessibility needs</option>
            <option value="child">Children</option>
          </select>
        </label>
      </div>
    </div>
  );
}
