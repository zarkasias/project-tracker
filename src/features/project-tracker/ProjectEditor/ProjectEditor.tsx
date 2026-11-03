import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { ProjectEditorState } from "../useProjectTracker";
import { trackerStyles } from "../trackerStyles";

type ProjectEditorProps = {
  editor: ProjectEditorState;
  notice: string;
  onChange: (name: string) => void;
  onSave: () => "invalid" | "failed" | "created" | "renamed";
  onCancel: () => void;
  onSavedRename: () => void;
};

export function ProjectEditor({
  editor,
  notice,
  onChange,
  onSave,
  onCancel,
  onSavedRename,
}: ProjectEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    input.current?.focus();
    return () => element.close();
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    const outcome = onSave();
    if (outcome === "renamed") {
      dialog.current?.close();
      onSavedRename();
    } else if (outcome === "invalid" || outcome === "created")
      input.current?.focus();
    // On write failure leave focus exactly where the user submitted.
  }

  function cancel() {
    dialog.current?.close();
    onCancel();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="project-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-40px)] w-[calc(100%-40px)] max-w-md overflow-y-auto border-0 bg-transparent p-0 text-ink backdrop:bg-[#020810]/80"
    >
      <section className={`${trackerStyles.panel} p-7`}>
        <div className="flex items-center justify-between gap-4">
          <h2 id="project-dialog-title" className="text-xl font-semibold">
            {editor.mode === "new" ? "A new project." : "Rename this project"}
          </h2>
          <button
            type="button"
            aria-label="Close project editor"
            onClick={cancel}
            className={`${trackerStyles.secondary} h-11 w-11 shrink-0 p-0`}
          >
            ×
          </button>
        </div>
        <form onSubmit={save} noValidate className="mt-6">
          <label
            htmlFor="project-name"
            className="mb-2 block text-xs font-medium"
          >
            Project name
          </label>
          <input
            ref={input}
            id="project-name"
            className={trackerStyles.input}
            placeholder="e.g. Northstar website"
            value={editor.name}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={!!editor.fieldError}
            aria-describedby={
              editor.fieldError
                ? "project-name-help project-name-error"
                : "project-name-help"
            }
          />
          <p
            id="project-name-help"
            className="mt-2 text-xs leading-5 text-muted"
          >
            Required. Up to 200 characters; surrounding spaces are removed.
          </p>
          {editor.fieldError && (
            <p
              id="project-name-error"
              role="alert"
              className="mt-3 text-sm text-error-text"
            >
              {editor.fieldError}
            </p>
          )}
          {editor.saveError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-error-edge bg-error-surface px-4 py-3 text-sm text-error-text"
            >
              {editor.saveError}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="submit" className={trackerStyles.primary}>
              {editor.mode === "new" ? "Create project" : "Save name"}
            </button>
            <button
              type="button"
              className={trackerStyles.secondary}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
          {editor.mode === "new" && (
            <p
              role="status"
              className="mt-4 text-sm [overflow-wrap:anywhere] break-words text-cobalt"
            >
              {notice}
            </p>
          )}
        </form>
      </section>
    </dialog>
  );
}
