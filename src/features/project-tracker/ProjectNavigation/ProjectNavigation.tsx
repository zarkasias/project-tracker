import type { RefObject } from "react";
import type { TrackerDocument } from "../projectTracker.types";
import { trackerStyles } from "../trackerStyles";

type ProjectNavigationProps = {
  document: TrackerDocument;
  selectedId: string | null;
  newButtonRef: RefObject<HTMLButtonElement | null>;
  onSelect: (id: string) => void;
  onNew: (opener: HTMLButtonElement) => void;
};
const markers = [
  "bg-[#6e9eff]",
  "bg-[#d8ab7c]",
  "bg-[#91b7c3]",
  "bg-[#b6a4d9]",
];

export function ProjectNavigation({
  document,
  selectedId,
  newButtonRef,
  onSelect,
  onNew,
}: ProjectNavigationProps) {
  return (
    <aside
      aria-label="Project workspace"
      className={`${trackerStyles.panel} min-w-0 px-3 py-5`}
    >
      <div className="mb-4 flex items-center justify-between px-3">
        <h2 className="font-mono text-[10px] tracking-[.1em] text-muted">
          PROJECTS
        </h2>
        <span className="font-mono text-[10px] text-muted">
          {String(document.projects.length).padStart(2, "0")}
        </span>
      </div>
      <nav
        aria-label="Projects"
        className="flex gap-1 overflow-x-auto p-1 lg:block lg:space-y-1"
      >
        {document.projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            aria-label={project.name}
            aria-current={selectedId === project.id ? "page" : undefined}
            onClick={(event) => {
              onSelect(project.id);
              event.currentTarget.focus();
            }}
            className={`flex min-h-14 w-[170px] shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus lg:w-full ${selectedId === project.id ? "border-[#80abff]/25 bg-[#447de0]/15 text-white" : "border-transparent text-[#b5c3d2] hover:bg-white/5"}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${markers[index % markers.length]}`}
            />
            <span className="min-w-0 flex-1 text-[13px] leading-5 [overflow-wrap:anywhere] break-words">
              {project.name}
            </span>
            <span
              aria-hidden="true"
              className="font-mono text-[10px] text-muted"
            >
              {
                document.tasks.filter((task) => task.projectId === project.id)
                  .length
              }
            </span>
          </button>
        ))}
      </nav>
      <button
        ref={newButtonRef}
        type="button"
        onClick={(event) => onNew(event.currentTarget)}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 text-xs text-[#c5d2e1] hover:border-white/40 hover:bg-white/5"
      >
        {" "}
        <span aria-hidden="true">＋</span> New project
      </button>
      <div className="mt-7 hidden border-t border-white/10 px-3 pt-5 lg:block">
        <p className="mb-2 font-mono text-[9px] tracking-[.12em] text-muted">
          YOUR OWN LITTLE ORBIT
        </p>
        <p className="text-[11px] leading-5 text-[#afbdce]">
          Projects and tasks.
          <br />
          One clear next step.
        </p>
      </div>
    </aside>
  );
}
