import { useState } from "react";
import type { TrackerStorage } from "./projectTracker.types";
import {
  addProject,
  renameProject,
  validateProjectName,
} from "./projectTransforms";
import { useTrackerStorage } from "./useTrackerStorage";
import { useTaskManagement } from "./useTaskManagement";

export type ProjectEditorState = {
  mode: "new" | "rename";
  projectId: string | null;
  name: string;
  fieldError: string | null;
  saveError: string | null;
};

/** One feature owner composes canonical storage state and transient project interactions. */
export function useProjectTracker(storage: TrackerStorage) {
  const state = useTrackerStorage(storage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ProjectEditorState | null>(null);
  const [notice, setNotice] = useState("");
  const selectedProject =
    state.document?.projects.find((project) => project.id === selectedId) ??
    state.document?.projects[0] ??
    null;

  const taskManagement = useTaskManagement(
    state.document,
    selectedProject?.id ?? null,
    state.commitDocument,
    setNotice,
  );

  function selectProject(id: string) {
    if (!state.document?.projects.some((project) => project.id === id)) return;
    setSelectedId(id);
    taskManagement.resetForProject();
    setEditor(null);
    setNotice("");
  }

  function openProject(mode: "new" | "rename") {
    if (!state.document || (mode === "rename" && !selectedProject)) return;
    setEditor({
      mode,
      projectId: mode === "rename" ? selectedProject!.id : null,
      name: mode === "rename" ? selectedProject!.name : "",
      fieldError: null,
      saveError: null,
    });
    setNotice("");
  }

  function changeName(name: string) {
    setNotice("");
    setEditor((current) =>
      current ? { ...current, name, fieldError: null, saveError: null } : null,
    );
  }

  function saveProject(): "invalid" | "failed" | "created" | "renamed" {
    if (!editor || !state.document) return "failed";
    const fieldError = validateProjectName(editor.name);
    if (fieldError) {
      setEditor({ ...editor, fieldError, saveError: null });
      return "invalid";
    }
    const name = editor.name.trim();
    let id = editor.projectId;
    if (editor.mode === "new") {
      try {
        id = crypto.randomUUID();
      } catch {
        setEditor({
          ...editor,
          saveError:
            "A project ID couldn’t be created. Try again in a browser that supports secure UUIDs.",
        });
        return "failed";
      }
    }
    const next =
      editor.mode === "new"
        ? addProject(state.document, { id: id!, name })
        : renameProject(state.document, id!, name);
    const outcome = state.commitDocument(next);
    if (!outcome.ok) {
      setEditor({ ...editor, saveError: outcome.message });
      return "failed";
    }
    setSelectedId(id);
    if (editor.mode === "new") {
      taskManagement.resetForProject();
      setEditor({ ...editor, name: "", fieldError: null, saveError: null });
      setNotice(`Project created: ${name}.`);
      return "created";
    }
    setEditor(null);
    setNotice(`Project renamed: ${name}.`);
    return "renamed";
  }

  return {
    ...state,
    taskManagement,
    selectedProject,
    editor,
    notice,
    selectProject,
    openProject,
    changeName,
    saveProject,
    cancelProject: () => setEditor(null),
  };
}
