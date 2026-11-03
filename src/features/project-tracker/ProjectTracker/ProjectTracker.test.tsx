import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ProjectTracker } from "./ProjectTracker";
import { sampleDocument } from "../testFixtures";
import { createTrackerStorage, TRACKER_STORAGE_KEY } from "../trackerStorage";
import type { TrackerStorage } from "../projectTracker.types";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test("missing storage offers project creation without writing until submission", () => {
  render(<ProjectTracker />);
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "No projects yet." }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Create your first project" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /add task/i }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBeNull();
});

test("loads real storage on remount and selects first persisted project with its task status", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(sampleDocument()));
  const view = render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toBeVisible();
  expect(screen.getByText("1 task in this project.")).toBeVisible();
  expect(
    screen.getByRole("combobox", {
      name: "Status for Review the mobile navigation",
    }),
  ).toHaveValue("In Progress");
  view.unmount();
  render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toBeVisible();
});

test("invalid data requires confirmed reset; cancel retains bytes and focus", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, "broken");
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<ProjectTracker />);
  const reset = screen.getByRole("button", { name: "Reset workspace" });
  fireEvent.click(reset);
  expect(reset).toHaveFocus();
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe("broken");
  expect(
    screen.queryByRole("heading", { name: "No projects yet." }),
  ).not.toBeInTheDocument();
});

test("confirmed reset writes a valid empty document and focuses the recovered heading", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, '{"schemaVersion":2}');
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<ProjectTracker />);
  fireEvent.click(screen.getByRole("button", { name: "Reset workspace" }));
  expect(JSON.parse(localStorage.getItem(TRACKER_STORAGE_KEY)!)).toEqual({
    schemaVersion: 1,
    projects: [],
    tasks: [],
  });
  expect(
    screen.getByRole("heading", { name: "No projects yet." }),
  ).toHaveFocus();
});

test("failed reset retains invalid bytes/recovery state and can be retried", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, "broken");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  let blocked = true;
  const storage = createTrackerStorage(() => ({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => {
      if (blocked) throw new Error("secret quota");
      localStorage.setItem(key, value);
    },
  }));
  render(<ProjectTracker storage={storage} />);
  const reset = screen.getByRole("button", { name: "Reset workspace" });
  fireEvent.click(reset);
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t be saved/i);
  expect(reset).toHaveFocus();
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe("broken");
  blocked = false;
  fireEvent.click(reset);
  expect(
    screen.getByRole("heading", { name: "No projects yet." }),
  ).toBeVisible();
});

test("read failure offers Retry only and can recover without writing", () => {
  const load = vi
    .fn<TrackerStorage["load"]>()
    .mockReturnValueOnce({
      kind: "unreadable",
      message: "Browser storage is unavailable. Retry loading.",
    })
    .mockReturnValue({ kind: "valid", document: sampleDocument() });
  const storage: TrackerStorage = { load, commit: vi.fn() };
  render(<ProjectTracker storage={storage} />);
  expect(
    screen.queryByRole("button", { name: "Reset workspace" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toHaveFocus();
  expect(storage.commit).not.toHaveBeenCalled();
});

test("retry reloads externally corrected invalid data without overwriting it", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, "broken");
  render(<ProjectTracker />);
  const raw = JSON.stringify(sampleDocument());
  localStorage.setItem(TRACKER_STORAGE_KEY, raw);
  fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toHaveFocus();
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
});
