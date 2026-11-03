/** Persisted array order is creation order. Selection and drafts are transient. */
export type TaskStatus = "To Do" | "In Progress" | "Done";

export interface Project {
  readonly id: string;
  readonly name: string;
}

export interface Task {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: TaskStatus;
}

export interface TrackerDocument {
  readonly schemaVersion: 1;
  readonly projects: readonly Project[];
  readonly tasks: readonly Task[];
}

export type LoadResult =
  | { readonly kind: "missing" }
  | { readonly kind: "valid"; readonly document: TrackerDocument }
  | { readonly kind: "unreadable"; readonly message: string }
  | { readonly kind: "malformed"; readonly message: string }
  | { readonly kind: "unsupported"; readonly message: string };

export type CommitResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "invalid-document" | "write-failed";
      readonly message: string;
    };

/**
 * Synchronous boundary implemented in task 02. Implementations report failures
 * through results and do not throw. A successful commit validates and saves the
 * complete document before the caller accepts it into canonical UI state.
 * User-facing messages must be actionable and omit raw exception details.
 */
export interface TrackerStorage {
  load(): LoadResult;
  commit(document: TrackerDocument): CommitResult;
}
