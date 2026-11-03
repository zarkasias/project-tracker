import type { TrackerDocument } from "./projectTracker.types";

export function sampleDocument(): TrackerDocument {
  return {
    schemaVersion: 1,
    projects: [
      { id: "project-1", name: "Northstar website" },
      { id: "project-2", name: "Studio operations" },
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Review the mobile navigation",
        status: "In Progress",
      },
    ],
  };
}
