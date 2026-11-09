import type { ShareLinkState } from "@seating/shared";
import { useState } from "react";

import { copyText } from "../../../lib/copyText";
import { shareLinkUrl } from "../lib/shareLinkUrl";

interface ShareLinkSectionProps {
  link: ShareLinkState;
  busy: boolean;
  onChange: (enabled: boolean, regenerate?: boolean) => Promise<void>;
}

/** The public read-only link: on/off, copy, and "New link" to cut off old ones. */
export function ShareLinkSection({ link, busy, onChange }: ShareLinkSectionProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = link.enabled && link.token ? shareLinkUrl(link.token) : null;

  async function handleCopy(): Promise<void> {
    if (!url) return;
    await copyText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section aria-label="Read-only link" className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Read-only link</span>
          <span className="text-xs text-base-content/70">
            Anyone with the link can see the seating chart and guest names, without signing in.
          </span>
        </span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={link.enabled}
          disabled={busy}
          onChange={(event) => void onChange(event.target.checked)}
        />
      </label>
      {url && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            aria-label="Read-only link"
            className="input input-bordered input-sm min-w-48 flex-1 font-mono text-xs"
            value={url}
            onFocus={(event) => event.target.select()}
          />
          <button type="button" className="btn btn-sm" onClick={() => void handleCopy()}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            title="Make a new link. The old one stops working."
            disabled={busy}
            onClick={() => void onChange(true, true)}
          >
            New link
          </button>
        </div>
      )}
    </section>
  );
}
