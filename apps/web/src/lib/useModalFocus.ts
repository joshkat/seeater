import { type RefObject, useEffect } from "react";

/** Everything Tab can land on. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Fields first, then the primary button, then anything focusable. */
const INITIAL = [
  "[data-autofocus]",
  "input:not([disabled]):not([type='hidden']):not([type='checkbox']):not([type='radio'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  ".btn-primary:not([disabled])",
].join(",");

/** Open modals, innermost last: only the innermost one traps Tab (e.g. the
 * placement dialog's "Replace?" confirmation over the dialog). */
const openModals: HTMLElement[] = [];

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[inert]") && element.getClientRects().length > 0,
  );
}

/**
 * Modal focus handling: on open, moves focus into the dialog (an `autoFocus`
 * element if it already took focus, else the first field, else the primary
 * button, else the first focusable thing), keeps Tab and Shift+Tab inside it,
 * and on close puts focus back where it was (the trigger).
 *
 * Pass the element that holds the dialog's content (usually `.modal-box`).
 */
export function useModalFocus(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!container.contains(document.activeElement)) {
      const initial =
        container.querySelector<HTMLElement>(INITIAL) ?? focusables(container)[0] ?? container;
      if (initial === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      initial.focus();
    }

    openModals.push(container);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab" || openModals[openModals.length - 1] !== container) return;
      const items = focusables(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const outside = !container.contains(current);
      if (event.shiftKey && (current === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openModals.splice(openModals.lastIndexOf(container), 1);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [ref, active]);
}
