import { useMemo } from 'react';

import { useGuestStore } from '../store/guestStore';
import { GuestListItem } from './GuestListItem';

/** Where a seat lives, for grouping the seated list by table. */
export interface SeatInfo {
  tableId: string;
  tableName: string;
  tableIndex: number;
  seatNumber: number;
}

interface GuestListProps {
  /** Resolves a seat id to its table + seat location, if known. */
  seatInfoFor: (seatId: string) => SeatInfo | null;
}

/** The guest list: unassigned guests, then seated guests grouped by table. */
export function GuestList({ seatInfoFor }: GuestListProps): JSX.Element {
  const guests = useGuestStore((state) => state.guests);
  const selectedGuestIds = useGuestStore((state) => state.selectedGuestIds);
  const selectGuest = useGuestStore((state) => state.selectGuest);
  const assignSeat = useGuestStore((state) => state.assignSeat);
  const removeGuest = useGuestStore((state) => state.removeGuest);
  const editGuest = useGuestStore((state) => state.editGuest);

  const unassigned = useMemo(
    () => guests.filter((g) => !g.seatId).sort((a, b) => a.name.localeCompare(b.name)),
    [guests],
  );

  // Group seated guests by their table, ordered by table number then seat.
  const tableGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        index: number;
        items: { guestId: string; seatNumber: number; guestContact: string | null }[];
      }
    >();
    for (const guest of guests) {
      if (!guest.seatId) continue;
      const info = seatInfoFor(guest.seatId);
      if (!info) continue;
      const group = groups.get(info.tableId) ?? {
        name: info.tableName,
        index: info.tableIndex,
        items: [],
      };
      group.items.push({
        guestId: guest.id,
        seatNumber: info.seatNumber,
        guestContact: guest.email ?? guest.phone ?? null,
      });
      groups.set(info.tableId, group);
    }
    return [...groups.values()]
      .sort((a, b) => a.index - b.index)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [guests, seatInfoFor]);

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const seatedCount = guests.length - unassigned.length;

  const renderItem = (guestId: string, subtitle: string | null): JSX.Element | null => {
    const guest = guestById.get(guestId);
    if (!guest) return null;
    return (
      <GuestListItem
        key={guest.id}
        guest={guest}
        subtitle={subtitle}
        selected={selectedGuestIds.includes(guest.id)}
        onSelect={(additive) => selectGuest(guest.id, additive)}
        onSetRsvp={(status) => void editGuest(guest.id, { rsvpStatus: status })}
        onUnseat={() => void assignSeat(guest.id, null)}
        onRemove={() => void removeGuest(guest.id)}
      />
    );
  };

  if (guests.length === 0) {
    return (
      <p className="mx-1 my-2 text-sm text-base-content/40">
        No guests yet. Add one above or import a spreadsheet.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <Section title={`Unassigned (${unassigned.length})`}>
        {unassigned.map((guest) => renderItem(guest.id, guest.email ?? guest.phone ?? null))}
        {unassigned.length === 0 && <EmptyHint>Everyone has a seat 🎉</EmptyHint>}
      </Section>

      <section>
        <h3 className={headingClass}>{`Seated (${seatedCount})`}</h3>
        {seatedCount === 0 && <EmptyHint>Drag a guest onto a seat to begin.</EmptyHint>}
        <div className="flex flex-col gap-2.5">
          {tableGroups.map((group) => (
            <div key={group.name}>
              <h4 className="mb-0.5 ml-1.5 text-xs font-semibold text-secondary">
                {group.name}
                <span className="font-normal text-base-content/40"> • {group.items.length}</span>
              </h4>
              <ul className={listClass}>
                {group.items.map((item) =>
                  renderItem(
                    item.guestId,
                    `Seat ${item.seatNumber} ${item.guestContact != null ? '• ' : ''}${item.guestContact ?? ''}`,
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const headingClass = 'mb-1 ml-1 text-[11px] uppercase tracking-wide text-base-content/60';
const listClass = 'm-0 flex list-none flex-col gap-0.5 p-0';

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section>
      <h3 className={headingClass}>{title}</h3>
      <ul className={listClass}>{children}</ul>
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="m-0 px-2 py-1 text-xs text-base-content/40">{children}</p>;
}
