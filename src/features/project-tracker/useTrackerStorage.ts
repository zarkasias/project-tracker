import { useState } from "react";
import type {
  CommitResult,
  LoadResult,
  TrackerDocument,
  TrackerStorage,
} from "./projectTracker.types";

const emptyDocument: TrackerDocument = {
  schemaVersion: 1,
  projects: [],
  tasks: [],
};

/** Own accepted data here; storage remains an effect boundary, not a second state owner. */
export function useTrackerStorage(storage: TrackerStorage) {
  const [result, setResult] = useState<LoadResult>(() => storage.load());
  const [error, setError] = useState<string | null>(null);
  const document =
    result.kind === "valid"
      ? result.document
      : result.kind === "missing"
        ? emptyDocument
        : null;

  function retry() {
    setError(null);
    setResult(storage.load());
  }

  function acceptCommit(next: TrackerDocument): CommitResult {
    const outcome = storage.commit(next);
    if (outcome.ok) {
      setResult({ kind: "valid", document: next });
      setError(null);
    } else setError(outcome.message);
    return outcome;
  }

  function commitDocument(next: TrackerDocument): CommitResult {
    if (document === null)
      return {
        ok: false,
        reason: "invalid-document",
        message: "Recover the saved workspace before making changes.",
      };
    return acceptCommit(next);
  }

  function reset() {
    if (result.kind !== "malformed" && result.kind !== "unsupported") return;
    return acceptCommit(emptyDocument);
  }

  return { result, document, error, retry, reset, commitDocument };
}
