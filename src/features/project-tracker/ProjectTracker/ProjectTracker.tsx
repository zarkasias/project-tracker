import { useEffect, useRef } from "react";
import type { TrackerStorage } from "../projectTracker.types";
import { createTrackerStorage } from "../trackerStorage";
import { useProjectTracker } from "../useProjectTracker";
import { TrackerFrame } from "../TrackerFrame/TrackerFrame";
import { StorageRecovery } from "../StorageRecovery/StorageRecovery";
import { ProjectNavigation } from "../ProjectNavigation/ProjectNavigation";
import { ProjectEditor } from "../ProjectEditor/ProjectEditor";
import { TaskBoard } from "../TaskBoard/TaskBoard";
import { trackerStyles } from "../trackerStyles";

const browserStorage = createTrackerStorage();
type ProjectTrackerProps = { storage?: TrackerStorage };

export function ProjectTracker({
  storage = browserStorage,
}: ProjectTrackerProps) {
  const tracker = useProjectTracker(storage);
  const {
    result,
    document,
    error,
    retry,
    reset,
    selectedProject,
    editor,
    notice,
  } = tracker;
  const heading = useRef<HTMLHeadingElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const recovering = useRef(false);
  useEffect(() => {
    if (recovering.current && document !== null) {
      heading.current?.focus();
      recovering.current = false;
    }
  }, [document]);

  function openProject(mode: "new" | "rename", trigger: HTMLButtonElement) {
    opener.current = trigger;
    tracker.openProject(mode);
  }
  function restoreOpener() {
    if (opener.current?.isConnected) opener.current.focus();
    else newButton.current?.focus();
  }
  function cancelProject() {
    tracker.cancelProject();
    restoreOpener();
  }

  if (result.kind !== "missing" && result.kind !== "valid") {
    return (
      <TrackerFrame>
        <StorageRecovery
          result={result}
          error={error}
          onRetry={() => {
            recovering.current = true;
            retry();
          }}
          onReset={() => {
            recovering.current = true;
            reset();
          }}
        />
      </TrackerFrame>
    );
  }
  const accepted = document!;
  const taskCount = accepted.tasks.filter(
    (task) => task.projectId === selectedProject?.id,
  ).length;
  return (
    <TrackerFrame>
      <div className="grid items-start gap-5 lg:grid-cols-[218px_minmax(0,1fr)] lg:gap-6">
        <ProjectNavigation
          document={accepted}
          selectedId={selectedProject?.id ?? null}
          newButtonRef={newButton}
          onSelect={tracker.selectProject}
          onNew={(trigger) => openProject("new", trigger)}
        />
        <div className="min-w-0">
          {selectedProject ? (
            <TaskBoard
              key={selectedProject.id}
              controller={tracker.taskManagement}
              heading={
                <div className="min-w-0 flex-1">
                  <p className="mb-2 font-mono text-[10px] tracking-[.12em] text-muted">
                    WORKSPACE / PROJECT{" "}
                    {String(
                      accepted.projects.findIndex(
                        (project) => project.id === selectedProject.id,
                      ) + 1,
                    ).padStart(2, "0")}
                  </p>
                  <div className="flex items-center gap-2">
                    <h1
                      id="workspace-heading"
                      ref={heading}
                      tabIndex={-1}
                      className="min-w-0 text-[28px] leading-tight font-semibold tracking-[-.7px] [overflow-wrap:anywhere] break-words sm:text-[30px]"
                    >
                      {selectedProject.name}
                    </h1>
                    <button
                      ref={renameButton}
                      type="button"
                      aria-label="Rename project"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white"
                      onClick={(event) =>
                        openProject("rename", event.currentTarget)
                      }
                    >
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#afbdce]">
                    {taskCount} {taskCount === 1 ? "task" : "tasks"} in this
                    project.
                  </p>
                </div>
              }
            />
          ) : (
            <section
              aria-labelledby="workspace-heading"
              className={`${trackerStyles.panel} px-6 py-16 text-center`}
            >
              <span
                aria-hidden="true"
                className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-action/15 text-cobalt"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 7V5h7l2 2h9v13H3z" />
                </svg>
              </span>
              <p className="font-mono text-[10px] tracking-[.16em] text-muted">
                A CLEAR PLACE TO START
              </p>
              <h1
                id="workspace-heading"
                ref={heading}
                tabIndex={-1}
                className="mt-4 text-[28px] font-semibold tracking-tight sm:text-[30px]"
              >
                No projects yet.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
                Make space for your next project. Gather the work in one place.
              </p>
              <button
                type="button"
                className={`${trackerStyles.primary} mt-7`}
                onClick={(event) => openProject("new", event.currentTarget)}
              >
                Create your first project
              </button>
            </section>
          )}
          <p
            role="status"
            className="mt-4 text-sm [overflow-wrap:anywhere] break-words text-cobalt"
          >
            {editor?.mode === "new" ? "" : notice}
          </p>
        </div>
      </div>
      {editor && (
        <ProjectEditor
          editor={editor}
          notice={notice}
          onChange={tracker.changeName}
          onSave={tracker.saveProject}
          onCancel={cancelProject}
          onSavedRename={() => renameButton.current?.focus()}
        />
      )}
    </TrackerFrame>
  );
}
