import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useProjectTracker } from "./useProjectTracker";
import { sampleDocument } from "./testFixtures";
import type { TrackerStorage } from "./projectTracker.types";

test("selecting a project disposes an unsaved rename without saving or leaking the draft", () => {
  const document = sampleDocument();
  const storage: TrackerStorage = {
    load: () => ({ kind: "valid", document }),
    commit: vi.fn(),
  };
  const { result } = renderHook(() => useProjectTracker(storage));
  act(() => result.current.openProject("rename"));
  act(() => result.current.changeName("Unsaved"));
  act(() => result.current.selectProject("project-2"));
  expect(result.current.editor).toBeNull();
  expect(result.current.selectedProject).toEqual(document.projects[1]);
  expect(result.current.document).toEqual(document);
  expect(storage.commit).not.toHaveBeenCalled();
  act(() => result.current.openProject("rename"));
  expect(result.current.editor?.name).toBe("Studio operations");
});

test.each(["malformed", "unsupported", "unreadable"] as const)(
  "project actions cannot commit or open editors when storage is %s",
  (kind) => {
    const storage: TrackerStorage = {
      load: () => ({ kind, message: "Recover first" }),
      commit: vi.fn(),
    };
    const { result } = renderHook(() => useProjectTracker(storage));
    act(() => result.current.openProject("new"));
    act(() => result.current.openProject("rename"));
    act(() => result.current.selectProject("project-1"));
    act(() => expect(result.current.saveProject()).toBe("failed"));
    expect(result.current.editor).toBeNull();
    expect(result.current.selectedProject).toBeNull();
    expect(storage.commit).not.toHaveBeenCalled();
  },
);
