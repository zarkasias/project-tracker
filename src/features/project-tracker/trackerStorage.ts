import type { TrackerStorage } from "./projectTracker.types";
import {
  hasUnsupportedSchema,
  isTrackerDocument,
} from "./validateTrackerDocument";

export const TRACKER_STORAGE_KEY = "project-tracker:v1";

/** Resolve storage lazily: even the browser localStorage getter can throw. */
export function createTrackerStorage(
  accessStorage: () => Pick<Storage, "getItem" | "setItem"> = () =>
    window.localStorage,
): TrackerStorage {
  return {
    load() {
      let raw: string | null;
      try {
        raw = accessStorage().getItem(TRACKER_STORAGE_KEY);
      } catch {
        return {
          kind: "unreadable",
          message:
            "Browser storage is unavailable. Check this site's storage permissions, then retry loading.",
        };
      }
      if (raw === null) return { kind: "missing" };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return {
          kind: "malformed",
          message:
            "The saved workspace couldn’t be read. Its contents have been left unchanged. Retry loading or reset this workspace.",
        };
      }
      if (hasUnsupportedSchema(parsed))
        return {
          kind: "unsupported",
          message:
            "The saved workspace has an unsupported format. Its contents have been left unchanged. Retry loading or reset this workspace.",
        };
      if (!isTrackerDocument(parsed))
        return {
          kind: "malformed",
          message:
            "The saved workspace contains invalid data. Its contents have been left unchanged. Retry loading or reset this workspace.",
        };
      return { kind: "valid", document: parsed };
    },
    commit(document) {
      try {
        if (!isTrackerDocument(document))
          return {
            ok: false,
            reason: "invalid-document",
            message:
              "This workspace contains invalid data and couldn’t be saved. Reload the workspace before trying again.",
          };
        // Serialize only the declared contract: extra fields/toJSON callbacks cannot
        // silently change the saved shape. Native setItem is atomic on failure.
        const serialized = JSON.stringify({
          schemaVersion: document.schemaVersion,
          projects: document.projects.map(({ id, name }) => ({ id, name })),
          tasks: document.tasks.map(({ id, projectId, title, status }) => ({
            id,
            projectId,
            title,
            status,
          })),
        });
        accessStorage().setItem(TRACKER_STORAGE_KEY, serialized);
        return { ok: true };
      } catch {
        return {
          ok: false,
          reason: "write-failed",
          message:
            "The workspace couldn’t be saved. Check available browser storage and this site's permissions, then try again. Your previous data is unchanged.",
        };
      }
    },
  };
}
