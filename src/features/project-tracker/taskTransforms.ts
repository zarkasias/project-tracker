import type { Task, TaskStatus, TrackerDocument } from "./projectTracker.types";

export const taskStatuses: readonly TaskStatus[] = [
  "To Do",
  "In Progress",
  "Done",
];

export function validateTaskTitle(title: string): string | null {
  if (!title.trim()) return "A task title is required.";
  return title.trim().length > 200
    ? "Use 200 characters or fewer for the task title."
    : null;
}
export function addTask(
  document: TrackerDocument,
  task: Task,
): TrackerDocument {
  return { ...document, tasks: [...document.tasks, task] };
}
export function updateTask(
  document: TrackerDocument,
  id: string,
  changes: Partial<Pick<Task, "title" | "status">>,
): TrackerDocument {
  return {
    ...document,
    tasks: document.tasks.map((task) =>
      task.id === id ? { ...task, ...changes } : task,
    ),
  };
}
export function removeTask(
  document: TrackerDocument,
  id: string,
): TrackerDocument {
  return {
    ...document,
    tasks: document.tasks.filter((task) => task.id !== id),
  };
}
