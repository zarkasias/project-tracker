import { useEffect, useRef } from "react";
import type { FormEvent, RefObject } from "react";
import type { TaskStatus } from "../projectTracker.types";
import type { TaskDraft } from "../taskManagement.types";
import { taskStatuses } from "../taskTransforms";
import { trackerStyles } from "../trackerStyles";

type TaskTitleFormProps = {
  mode: "new" | "edit";
  draft: TaskDraft;
  status?: TaskStatus;
  inputRef?: RefObject<HTMLInputElement | null>;
  onTitle: (title: string) => void;
  onStatus?: (status: TaskStatus) => void;
  onSave: () => "invalid" | "failed" | "saved";
  onCancel: () => void;
};

export function TaskTitleForm({
  mode,
  draft,
  status,
  inputRef,
  onTitle,
  onStatus,
  onSave,
  onCancel,
}: TaskTitleFormProps) {
  const ownInput = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownInput;
  const id = mode === "new" ? "new-task-title" : "edit-task-title";
  useEffect(() => {
    input.current?.focus();
  }, [input]);

  function save(event: FormEvent) {
    event.preventDefault();
    const outcome = onSave();
    if (outcome === "invalid" || (outcome === "saved" && mode === "new"))
      input.current?.focus();
  }
  return (
    <form
      aria-label={mode === "new" ? "Create task" : "Edit task"}
      onSubmit={save}
      noValidate
      className="border-b border-white/15 bg-action/10 p-5"
    >
      <label htmlFor={id} className="mb-2 block text-xs font-medium">
        {mode === "new" ? "New task" : "Task title"}
      </label>
      <input
        ref={input}
        id={id}
        className={trackerStyles.input}
        value={draft.title}
        onChange={(event) => onTitle(event.target.value)}
        placeholder="What needs to happen?"
        aria-invalid={!!draft.fieldError}
        aria-describedby={
          draft.fieldError ? `${id}-help ${id}-error` : `${id}-help`
        }
      />
      <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-muted">
        Required. Up to 200 characters; surrounding spaces are removed.
      </p>
      {mode === "edit" && (
        <label className="mt-3 block text-xs font-medium">
          Task status
          <select
            value={status}
            onChange={(event) => onStatus?.(event.target.value as TaskStatus)}
            className={`${trackerStyles.input} mt-2`}
          >
            {taskStatuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      )}
      {draft.fieldError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-3 text-sm text-error-text"
        >
          {draft.fieldError}
        </p>
      )}
      {draft.saveError && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-error-edge bg-error-surface px-4 py-3 text-sm text-error-text"
        >
          {draft.saveError}
        </p>
      )}
      {mode === "edit" && (
        <p className="mt-3 text-xs text-muted">
          Save or cancel this edit before changing another task.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" className={trackerStyles.primary}>
          {mode === "new" ? "Create task" : "Save changes"}
        </button>
        <button
          type="button"
          className={trackerStyles.secondary}
          onClick={onCancel}
        >
          {mode === "new" ? "Cancel creation" : "Cancel edit"}
        </button>
      </div>
    </form>
  );
}
