/** Shared drag-and-drop contract for dragging a guest from the list onto a
 * seat in the canvas. We stash the id under a custom MIME type (and plain text
 * as a fallback) so the canvas drop handler can identify the dragged guest. */
export const GUEST_DND_TYPE = 'application/x-seating-guest';

export function setGuestDragData(dataTransfer: DataTransfer, guestId: string): void {
  dataTransfer.setData(GUEST_DND_TYPE, guestId);
  dataTransfer.setData('text/plain', guestId);
  dataTransfer.effectAllowed = 'move';
}

export function getGuestDragData(dataTransfer: DataTransfer): string | null {
  return dataTransfer.getData(GUEST_DND_TYPE) || dataTransfer.getData('text/plain') || null;
}
