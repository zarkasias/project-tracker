import { useState } from "react";
import type {
  CommitResult,
  TaskStatus,
  TrackerDocument,
} from "./projectTracker.types";
import {
  addTask,
  removeTask,
  updateTask,
  validateTaskTitle,
} from "./taskTransforms";
import type { TaskDraft, TaskEdit, TaskFilter } from "./taskManagement.types";

/** Transient task interactions; canonical data remains owned by the existing storage hook. */
export function useTaskManagement(
  document: TrackerDocument | null,
  projectId: string | null,
  commit: (next: TrackerDocument) => CommitResult,
  announce: (message: string) => void,
) {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [creation, setCreation] = useState<TaskDraft | null>(null);
  const [editing, setEditing] = useState<TaskEdit | null>(null);
  const [operationError, setOperationError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const projectTasks =
    document?.tasks.filter((task) => task.projectId === projectId) ?? [];
  const visibleTasks = projectTasks.filter(
    (task) => filter === "All" || task.status === filter,
  );

  function resetForProject() {
    setFilter("All");
    setCreation(null);
    setEditing(null);
    setOperationError(null);
  }
  function startCreate() {
    if (!document || !projectId) return;
    setCreation(
      (current) => current ?? { title: "", fieldError: null, saveError: null },
    );
    announce("");
  }
  function changeNewTitle(title: string) {
    setCreation((current) =>
      current ? { ...current, title, fieldError: null, saveError: null } : null,
    );
    announce("");
  }
  function saveNew(): "invalid" | "failed" | "saved" {
    if (!document || !projectId || !creation) return "failed";
    const fieldError = validateTaskTitle(creation.title);
    if (fieldError) {
      setCreation({ ...creation, fieldError, saveError: null });
      return "invalid";
    }
    let id: string;
    try {
      id = crypto.randomUUID();
    } catch {
      setCreation({
        ...creation,
        saveError:
          "A task ID couldn’t be created. Retry in a browser that supports secure UUIDs.",
      });
      return "failed";
    }
    const outcome = commit(
      addTask(document, {
        id,
        projectId,
        title: creation.title.trim(),
        status: "To Do",
      }),
    );
    if (!outcome.ok) {
      setCreation({ ...creation, saveError: outcome.message });
      return "failed";
    }
    setCreation({ title: "", fieldError: null, saveError: null });
    announce(`Task created in To Do: ${creation.title.trim()}.`);
    return "saved";
  }
  function startEdit(id: string) {
    const task = projectTasks.find((task) => task.id === id);
    if (!task) return;
    setEditing({ ...task, fieldError: null, saveError: null });
    setOperationError(null);
    announce("");
  }
  function changeEdit(changes: Partial<Pick<TaskEdit, "title" | "status">>) {
    setEditing((current) =>
      current
        ? { ...current, ...changes, fieldError: null, saveError: null }
        : null,
    );
    announce("");
  }
  function saveEdit():
    | { kind: "invalid" | "failed" }
    | { kind: "saved"; id: string; visible: boolean } {
    if (
      !document ||
      !editing ||
      editing.projectId !== projectId ||
      !projectTasks.some((task) => task.id === editing.id)
    )
      return { kind: "failed" };
    const fieldError = validateTaskTitle(editing.title);
    if (fieldError) {
      setEditing({ ...editing, fieldError, saveError: null });
      return { kind: "invalid" };
    }
    const outcome = commit(
      updateTask(document, editing.id, {
        title: editing.title.trim(),
        status: editing.status,
      }),
    );
    if (!outcome.ok) {
      setEditing({ ...editing, saveError: outcome.message });
      return { kind: "failed" };
    }
    setEditing(null);
    setOperationError(null);
    announce(`Task saved: ${editing.title.trim()}.`);
    return {
      kind: "saved",
      id: editing.id,
      visible: filter === "All" || editing.status === filter,
    };
  }
  function changeStatus(id: string, status: TaskStatus): boolean {
    if (!document || !projectTasks.some((task) => task.id === id)) return false;
    const outcome = commit(updateTask(document, id, { status }));
    if (!outcome.ok) {
      setOperationError({ id, message: outcome.message });
      return false;
    }
    setOperationError(null);
    announce(`Task status changed to ${status}.`);
    return true;
  }
  function deleteTask(id: string): boolean {
    const task = projectTasks.find((task) => task.id === id);
    if (!document || !task) return false;
    const outcome = commit(removeTask(document, id));
    if (!outcome.ok) {
      setOperationError({ id, message: outcome.message });
      return false;
    }
    if (editing?.id === id) setEditing(null);
    setOperationError(null);
    announce(`Task deleted: ${task.title}.`);
    return true;
  }
  function chooseFilter(next: TaskFilter) {
    setFilter(next);
    setOperationError(null);
  }
  return {
    projectTasks,
    visibleTasks,
    filter,
    creation,
    editing,
    operationError,
    resetForProject,
    startCreate,
    changeNewTitle,
    saveNew,
    startEdit,
    changeEdit,
    saveEdit,
    changeStatus,
    deleteTask,
    chooseFilter,
    cancelCreate: () => setCreation(null),
    cancelEdit: () => setEditing(null),
  };
}
