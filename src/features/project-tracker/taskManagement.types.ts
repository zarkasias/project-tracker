import type { TaskStatus } from "./projectTracker.types";

export type TaskFilter = "All" | TaskStatus;
export type TaskDraft = {
  title: string;
  fieldError: string | null;
  saveError: string | null;
};
export type TaskEdit = TaskDraft & {
  id: string;
  projectId: string;
  status: TaskStatus;
};
