import { applyTemplate, findTemplate } from "@seating/shared";
import { useRef, useState } from "react";

import { useModalFocus } from "../../../lib/useModalFocus";
import { useDocumentStore } from "../../editor/store/documentStore";
import { useEditorStore } from "../../editor/store/editorStore";
import { TemplatePicker } from "./TemplatePicker";

/** Lays out the current layout from a template (keeps the guest list; one undoable edit). */
export function ApplyTemplateDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  useModalFocus(boxRef);
  const [templateId, setTemplateId] = useState<string | null>("wedding-reception");

  function handleApply(): void {
    const template = templateId ? findTemplate(templateId) : undefined;
    if (!template) return;
    useDocumentStore.getState().apply((doc) => applyTemplate(doc, template));
    useEditorStore.getState().resetView();
    onClose();
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Use a template">
      <div
        ref={boxRef}
        className="modal-box flex max-h-[90vh] max-w-2xl flex-col gap-3 text-base-content"
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <h2 className="text-lg font-semibold">Use a template</h2>
        <p className="text-sm text-base-content/60">
          Sets up this layout’s room. Your guest list stays; you can undo it.
        </p>
        <div className="min-h-0 overflow-y-auto">
          <TemplatePicker value={templateId} onChange={setTemplateId} withBlank={false} />
        </div>
        <div className="modal-action mt-1">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!templateId}
            onClick={handleApply}
          >
            Use template
          </button>
        </div>
      </div>
    </div>
  );
}
