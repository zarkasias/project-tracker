import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Task, TaskStatus } from "../projectTracker.types";
import { taskStatuses } from "../taskTransforms";
import { TaskTitleForm } from "../TaskTitleForm/TaskTitleForm";
import { trackerStyles } from "../trackerStyles";
import type { useTaskManagement } from "../useTaskManagement";

type FocusTarget =
  { kind: "edit"; id: string } | { kind: "list" } | { kind: "add" };
type TaskBoardProps = {
  heading: ReactNode;
  controller: ReturnType<typeof useTaskManagement>;
};
const treatments: Record<
  TaskStatus,
  { summary: string; marker: string; status: string; copy: string }
> = {
  "To Do": {
    summary:
      "bg-[linear-gradient(130deg,rgba(56,75,103,0.82),rgba(17,31,48,0.90))]",
    marker: "bg-cobalt/40",
    status: "border-[#6d9ae2]/25 bg-[#213c65]/75 text-[#c1d7ff]",
    copy: "Ready for the next step.",
  },
  "In Progress": {
    summary:
      "bg-[linear-gradient(130deg,rgba(64,71,87,0.82),rgba(26,31,42,0.90))]",
    marker: "bg-progress/40",
    status: "border-[#d9b86e]/25 bg-[#4d3a1b]/80 text-[#f3ce8d]",
    copy: "Good work in motion.",
  },
  Done: {
    summary:
      "bg-[linear-gradient(130deg,rgba(45,73,69,0.82),rgba(17,32,35,0.90))]",
    marker: "bg-done/40",
    status: "border-[#6abd99]/25 bg-[#163f35]/80 text-[#a7edc8]",
    copy: "A little further forward.",
  },
};

export function TaskBoard({ heading, controller: tasks }: TaskBoardProps) {
  const addButton = useRef<HTMLButtonElement>(null);
  const creationInput = useRef<HTMLInputElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  useEffect(() => {
    if (focus?.kind === "edit") editButtons.current.get(focus.id)?.focus();
    if (focus?.kind === "list") listHeading.current?.focus();
    if (focus?.kind === "add") addButton.current?.focus();
  }, [focus]);

  function openCreation() {
    tasks.startCreate();
    creationInput.current?.focus();
  }
  function saveEdit(): "invalid" | "failed" | "saved" {
    const outcome = tasks.saveEdit();
    if (outcome.kind === "saved") {
      setFocus(
        outcome.visible ? { kind: "edit", id: outcome.id } : { kind: "list" },
      );
      return "saved";
    }
    return outcome.kind;
  }
  function changeStatus(task: Task, status: TaskStatus) {
    if (
      tasks.changeStatus(task.id, status) &&
      tasks.filter !== "All" &&
      status !== tasks.filter
    )
      setFocus({ kind: "list" });
  }
  function deleteTask(task: Task, trigger: HTMLButtonElement) {
    const confirmed = window.confirm(
      `Delete “${task.title}”? This cannot be undone.`,
    );
    trigger.focus();
    if (!confirmed) return;
    const index = tasks.visibleTasks.findIndex((item) => item.id === task.id);
    const neighbor =
      tasks.visibleTasks[index + 1] ?? tasks.visibleTasks[index - 1];
    if (tasks.deleteTask(task.id))
      setFocus(neighbor ? { kind: "edit", id: neighbor.id } : { kind: "add" });
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
        {heading}
        <button
          ref={addButton}
          type="button"
          className={trackerStyles.primary}
          onClick={openCreation}
        >
          <span aria-hidden="true">＋</span>Add task
        </button>
      </div>
      <section
        aria-label="Project status summary"
        className="mb-5 grid gap-4 sm:grid-cols-3"
      >
        {taskStatuses.map((status) => (
          <div
            key={status}
            className={`${trackerStyles.summaryPanel} ${treatments[status].summary} px-5 py-4`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-[10px] tracking-[.08em] text-muted">
                {status}
              </h2>
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${treatments[status].marker}`}
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] leading-none font-semibold tracking-[-.8px] tabular-nums">
                {String(
                  tasks.projectTasks.filter((task) => task.status === status)
                    .length,
                ).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted">tasks</span>
            </div>
            <p className="mt-3 text-[11px] text-[#becadb]">
              {treatments[status].copy}
            </p>
            <span
              aria-hidden="true"
              className={`absolute right-5 bottom-1 left-5 h-px ${treatments[status].marker}`}
            />
          </div>
        ))}
      </section>
      <section
        aria-labelledby="task-list-heading"
        className={trackerStyles.panel}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2
              id="task-list-heading"
              ref={listHeading}
              tabIndex={-1}
              className="font-mono text-[11px] tracking-[.1em]"
            >
              Project tasks
            </h2>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted">
              {tasks.visibleTasks.length}
            </span>
          </div>
          <div
            role="group"
            aria-label="Filter tasks by status"
            className="flex max-w-full flex-wrap gap-1 rounded-lg border border-white/10 bg-[#07111f]/35 p-1"
          >
            {(["All", ...taskStatuses] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={filter === tasks.filter}
                onClick={() => tasks.chooseFilter(filter)}
                className={`min-h-8 rounded-md px-3 text-[11px] ${filter === tasks.filter ? "bg-[#477ce8]/25 text-[#cce0ff] shadow-[inset_0_0_0_1px_rgb(141_180_255/25%)]" : "text-muted hover:bg-white/5 hover:text-white"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        {tasks.creation && (
          <TaskTitleForm
            mode="new"
            draft={tasks.creation}
            inputRef={creationInput}
            onTitle={tasks.changeNewTitle}
            onSave={tasks.saveNew}
            onCancel={() => {
              tasks.cancelCreate();
              setFocus({ kind: "add" });
            }}
          />
        )}
        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,1fr)_128px_80px] gap-4 border-b border-white/10 px-5 py-3 font-mono text-[9px] tracking-[.13em] text-muted sm:grid"
        >
          <span>TASK</span>
          <span>STATUS</span>
          <span className="text-right">ACTIONS</span>
        </div>
        <ul aria-label="Tasks" className="m-0 list-none p-0">
          {tasks.visibleTasks.map((task, index) => (
            <li
              key={task.id}
              aria-label={task.title}
              className="border-b border-white/[.07] last:border-b-0"
            >
              {tasks.editing?.id === task.id ? (
                <TaskTitleForm
                  mode="edit"
                  draft={tasks.editing}
                  status={tasks.editing.status}
                  onTitle={(title) => tasks.changeEdit({ title })}
                  onStatus={(status) => tasks.changeEdit({ status })}
                  onSave={saveEdit}
                  onCancel={() => {
                    tasks.cancelEdit();
                    setFocus({ kind: "edit", id: task.id });
                  }}
                />
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-2.5 hover:bg-white/[.035] sm:grid-cols-[minmax(0,1fr)_128px_80px]">
                  <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
                    <span
                      aria-hidden="true"
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${task.status === "Done" ? "border-done/40 bg-done/15 text-done" : "border-white/25"}`}
                    >
                      {task.status === "Done"
                        ? "✓"
                        : task.status === "In Progress"
                          ? "·"
                          : ""}
                    </span>
                    <span
                      className={`min-w-0 text-[13px] leading-5 [overflow-wrap:anywhere] ${task.status === "Done" ? "text-[#aab9cb]" : "text-[#edf3fb]"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <select
                    disabled={!!tasks.editing}
                    aria-label={`Status for ${task.title}`}
                    aria-describedby={
                      tasks.operationError?.id === task.id
                        ? `task-error-${index}`
                        : undefined
                    }
                    value={task.status}
                    onChange={(event) =>
                      changeStatus(task, event.target.value as TaskStatus)
                    }
                    className={`min-h-8 max-w-full rounded-md border px-2 text-[11px] ${treatments[task.status].status}`}
                  >
                    {taskStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      ref={(element) => {
                        if (element) editButtons.current.set(task.id, element);
                        else editButtons.current.delete(task.id);
                      }}
                      type="button"
                      disabled={!!tasks.editing}
                      aria-label={`Edit ${task.title}`}
                      className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      onClick={() => tasks.startEdit(task.id)}
                    >
                      <svg
                        aria-hidden="true"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={!!tasks.editing}
                      aria-label={`Delete ${task.title}`}
                      aria-describedby={
                        tasks.operationError?.id === task.id
                          ? `task-error-${index}`
                          : undefined
                      }
                      className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
                      onClick={(event) => deleteTask(task, event.currentTarget)}
                    >
                      <svg
                        aria-hidden="true"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {tasks.operationError?.id === task.id && (
                <p
                  id={`task-error-${index}`}
                  role="alert"
                  className="mx-5 mb-4 rounded-lg border border-error-edge bg-error-surface px-4 py-3 text-sm text-error-text"
                >
                  {tasks.operationError.message}
                </p>
              )}
            </li>
          ))}
        </ul>
        {!tasks.visibleTasks.length && (
          <div className="px-6 py-12 text-center">
            <h3 className="text-sm font-medium">
              {tasks.projectTasks.length
                ? "No tasks in this view."
                : "A clear slate for your next step."}
            </h3>
            <p className="mt-2 text-xs text-muted">
              {tasks.projectTasks.length
                ? "Try another status to see the rest of your work."
                : "Add the first task to get this project moving."}
            </p>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 font-mono text-[9px] tracking-wide text-muted">
          <span>
            {tasks.visibleTasks.length} OF {tasks.projectTasks.length} TASKS
          </span>
          <span>
            {tasks.projectTasks.filter((task) => task.status === "Done").length}{" "}
            COMPLETED /{" "}
            {tasks.projectTasks.filter((task) => task.status !== "Done").length}{" "}
            REMAINING
          </span>
        </footer>
      </section>
    </>
  );
}
