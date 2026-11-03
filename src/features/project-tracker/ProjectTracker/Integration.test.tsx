import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ProjectTracker } from "./ProjectTracker";
import { TRACKER_STORAGE_KEY } from "../trackerStorage";
import { isTrackerDocument } from "../validateTrackerDocument";
import type { TrackerDocument } from "../projectTracker.types";

import workloadFixture from "../../../../../../trials/project-tracker/validation/05-integration/workload.json";

const workload = (): TrackerDocument =>
  structuredClone(workloadFixture) as TrackerDocument;
const stored = (): TrackerDocument =>
  JSON.parse(localStorage.getItem(TRACKER_STORAGE_KEY)!);
const select = (name: string) =>
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Projects" })).getByRole(
      "button",
      { name },
    ),
  );
const change = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
const input = () => screen.getByRole("textbox", { name: "Project name" });
const filter = (value: string) =>
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Filter tasks by status" }),
    ).getByRole("button", { name: value }),
  );

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  // jsdom scaffolding only; not native-browser modal verification.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

test("complete two-project create/rename/task/filter/cancel/delete/reload journey preserves isolation", () => {
  const view = render(<ProjectTracker />);
  fireEvent.click(
    screen.getByRole("button", { name: "Create your first project" }),
  );
  change(input(), "First");
  fireEvent.submit(input().closest("form")!);
  change(input(), "Second");
  fireEvent.submit(input().closest("form")!);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
  change(screen.getByRole("textbox", { name: "New task" }), "Ship it");
  fireEvent.submit(screen.getByRole("form", { name: "Create task" }));
  change(screen.getByRole("combobox", { name: "Status for Ship it" }), "Done");
  filter("Done");
  fireEvent.click(screen.getByRole("button", { name: "Edit Ship it" }));
  change(screen.getByRole("textbox", { name: "Task title" }), "Unsaved");
  select("First");
  select("Second");
  expect(screen.getByRole("listitem", { name: "Ship it" })).toBeVisible();
  expect(
    screen.queryByRole("textbox", { name: "Task title" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  change(input(), "Second renamed");
  fireEvent.submit(input().closest("form")!);
  vi.spyOn(window, "confirm")
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole("button", { name: "Delete Ship it" }));
  expect(screen.getByRole("listitem", { name: "Ship it" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Delete Ship it" }));
  expect(screen.getByRole("button", { name: "Add task" })).toHaveFocus();
  view.unmount();
  render(<ProjectTracker />);
  expect(screen.getByRole("heading", { name: "First" })).toBeVisible();
  select("Second renamed");
  expect(screen.getByText("A clear slate for your next step.")).toBeVisible();
  expect(isTrackerDocument(stored())).toBe(true);
});

test("20 projects and 1000 tasks support filtered edits/create/status/delete/rename/reload without cross-project changes", () => {
  const original = workload();
  expect(isTrackerDocument(original)).toBe(true);
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(original));
  const view = render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: original.projects[0].name }),
  ).toBeVisible();
  expect(screen.getAllByRole("listitem")).toHaveLength(50);
  select(original.projects[19].name);
  for (const [value, count] of [
    ["To Do", 17],
    ["In Progress", 17],
    ["Done", 16],
    ["All", 50],
  ] as const) {
    filter(value);
    expect(screen.getAllByRole("listitem")).toHaveLength(count);
  }
  const first = original.tasks[950];
  fireEvent.click(screen.getByRole("button", { name: `Edit ${first.title}` }));
  change(
    screen.getByRole("textbox", { name: "Task title" }),
    "Edited workload task",
  );
  change(screen.getByRole("combobox", { name: "Task status" }), "Done");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
  change(
    screen.getByRole("textbox", { name: "New task" }),
    "New workload task",
  );
  fireEvent.submit(screen.getByRole("form", { name: "Create task" }));
  change(
    screen.getByRole("combobox", { name: "Status for New workload task" }),
    "In Progress",
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(
    screen.getByRole("button", { name: `Delete ${original.tasks[951].title}` }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  change(input(), "Last project renamed");
  fireEvent.submit(input().closest("form")!);
  const saved = stored();
  expect(saved.tasks).toHaveLength(1000);
  expect(isTrackerDocument(saved)).toBe(true);
  expect(saved.tasks.filter((task) => task.projectId !== "p-19")).toEqual(
    original.tasks.filter((task) => task.projectId !== "p-19"),
  );
  expect(saved.projects.slice(0, 19)).toEqual(original.projects.slice(0, 19));
  view.unmount();
  render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: original.projects[0].name }),
  ).toBeVisible();
  select("Last project renamed");
  expect(
    screen.getByRole("listitem", { name: "Edited workload task" }),
  ).toBeVisible();
  expect(
    screen.getByRole("combobox", { name: "Status for New workload task" }),
  ).toHaveValue("In Progress");
  expect(
    screen.queryByRole("listitem", { name: original.tasks[951].title }),
  ).not.toBeInTheDocument();
});
