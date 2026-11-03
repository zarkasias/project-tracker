import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { LoadResult, TrackerStorage } from "./projectTracker.types";
import { sampleDocument } from "./testFixtures";
import { useTrackerStorage } from "./useTrackerStorage";

test("accepts next canonical data only after a successful real commit boundary outcome", () => {
  const original = sampleDocument();
  const next = {
    ...original,
    projects: [{ id: "project-1", name: "Saved name" }, original.projects[1]],
  };
  let canSave = false;
  const commit = vi.fn<TrackerStorage["commit"]>(() =>
    canSave
      ? { ok: true }
      : {
          ok: false,
          reason: "write-failed",
          message: "Storage is full. Try again.",
        },
  );
  const storage: TrackerStorage = {
    load: () => ({ kind: "valid", document: original }),
    commit,
  };
  const { result } = renderHook(() => useTrackerStorage(storage));
  act(() => {
    expect(result.current.commitDocument(next).ok).toBe(false);
  });
  expect(result.current.document).toEqual(original);
  expect(result.current.error).toBe("Storage is full. Try again.");
  canSave = true;
  act(() => {
    expect(result.current.commitDocument(next).ok).toBe(true);
  });
  expect(commit).toHaveBeenLastCalledWith(next);
  expect(result.current.document).toEqual(next);
  expect(result.current.error).toBeNull();
});

test.each(["malformed", "unsupported", "unreadable"] as const)(
  "blocks ordinary commits during %s recovery",
  (kind) => {
    const loadResult: LoadResult = { kind, message: "Recover first." };
    const storage: TrackerStorage = { load: () => loadResult, commit: vi.fn() };
    const { result } = renderHook(() => useTrackerStorage(storage));
    act(() => {
      expect(result.current.commitDocument(sampleDocument())).toMatchObject({
        ok: false,
      });
    });
    expect(storage.commit).not.toHaveBeenCalled();
    expect(result.current.document).toBeNull();
  },
);

test("read failures cannot use reset to overwrite inaccessible storage", () => {
  const storage: TrackerStorage = {
    load: () => ({ kind: "unreadable", message: "Retry loading." }),
    commit: vi.fn(),
  };
  const { result } = renderHook(() => useTrackerStorage(storage));
  act(() => {
    result.current.reset();
  });
  expect(storage.commit).not.toHaveBeenCalled();
  expect(result.current.result.kind).toBe("unreadable");
});
