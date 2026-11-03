import type { TrackerDocument } from "./projectTracker.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value === value.trim()
  );
}

function isTitle(value: unknown): value is string {
  return isId(value) && value.length <= 200;
}

/** Validate without normalizing or dropping stored data. IDs are unique document-wide. */
export function isTrackerDocument(value: unknown): value is TrackerDocument {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.tasks)
  )
    return false;
  const projectIds = new Set<string>();
  const allIds = new Set<string>();
  for (const project of value.projects) {
    if (
      !isRecord(project) ||
      !isId(project.id) ||
      !isTitle(project.name) ||
      allIds.has(project.id)
    )
      return false;
    projectIds.add(project.id);
    allIds.add(project.id);
  }
  for (const task of value.tasks) {
    if (
      !isRecord(task) ||
      !isId(task.id) ||
      !isTitle(task.title) ||
      typeof task.projectId !== "string" ||
      !projectIds.has(task.projectId) ||
      allIds.has(task.id) ||
      !["To Do", "In Progress", "Done"].includes(task.status as string)
    )
      return false;
    allIds.add(task.id);
  }
  return true;
}

export function hasUnsupportedSchema(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === "number" &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion > 0 &&
    value.schemaVersion !== 1
  );
}
