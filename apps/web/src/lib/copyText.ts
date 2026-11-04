/**
 * Copies text to the system clipboard. `navigator.clipboard` only exists in
 * secure contexts (HTTPS or localhost); a self-hosted copy opened over plain
 * HTTP on a LAN address falls back to a hidden textarea + `execCommand`.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.className = "fixed -left-[9999px] top-0";
  const previous = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy was blocked");
  } finally {
    area.remove();
    previous?.focus();
  }
}
