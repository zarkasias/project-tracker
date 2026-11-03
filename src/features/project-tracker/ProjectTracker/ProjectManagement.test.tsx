import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ProjectTracker } from "./ProjectTracker";
import { createTrackerStorage, TRACKER_STORAGE_KEY } from "../trackerStorage";
import { sampleDocument } from "../testFixtures";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  // jsdom has no native modal/top-layer behavior. Browser focus trapping is separate.
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

function stored() {
  return JSON.parse(localStorage.getItem(TRACKER_STORAGE_KEY)!);
}
function nameInput() {
  return screen.getByRole("textbox", { name: "Project name" });
}
function openNew() {
  fireEvent.click(screen.getByRole("button", { name: "New project" }));
}
function enterName(name: string) {
  fireEvent.change(nameInput(), { target: { value: name } });
}
function create(name: string) {
  openNew();
  enterName(name);
  fireEvent.click(screen.getByRole("button", { name: "Create project" }));
}
function projectButton(name: string) {
  return within(screen.getByRole("navigation", { name: "Projects" })).getByRole(
    "button",
    { name },
  );
}

test("creates trimmed projects with UUIDs, selects new project and retains cleared creation input focus", () => {
  render(<ProjectTracker />);
  create("  First project  ");
  expect(stored().projects).toEqual([
    { id: expect.stringMatching(/^[0-9a-f-]{36}$/), name: "First project" },
  ]);
  expect(nameInput()).toHaveValue("");
  expect(nameInput()).toHaveFocus();
  expect(
    within(screen.getByRole("dialog")).getByRole("status"),
  ).toHaveTextContent("Project created");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("heading", { name: "First project" })).toBeVisible();
  expect(screen.getByRole("button", { name: "New project" })).toHaveFocus();
});

test.each(["   ", "x".repeat(201)])(
  "invalid project name stays in editor and focuses the associated field: %s",
  (name) => {
    render(<ProjectTracker />);
    create(name);
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(nameInput()).toHaveAccessibleDescription(/required|200/);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBeNull();
  },
);

test("accepts 200 characters and duplicate names while keeping distinct IDs and order", () => {
  render(<ProjectTracker />);
  const name = "x".repeat(200);
  create(name);
  enterName(name);
  expect(
    within(screen.getByRole("dialog")).getByRole("status"),
  ).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole("button", { name: "Create project" }));
  expect(stored().projects.map((p: { name: string }) => p.name)).toEqual([
    name,
    name,
  ]);
  expect(stored().projects[0].id).not.toBe(stored().projects[1].id);
  expect(nameInput()).toHaveValue("");
});

test("selects projects without persisting selection and reload selects the first project", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(sampleDocument()));
  const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
  const view = render(<ProjectTracker />);
  fireEvent.click(projectButton("Studio operations"));
  expect(projectButton("Studio operations")).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(projectButton("Studio operations")).toHaveFocus();
  expect(
    screen.getByRole("heading", { name: "Studio operations" }),
  ).toBeVisible();
  expect(screen.getByText("0 tasks in this project.")).toBeVisible();
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
  view.unmount();
  render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toBeVisible();
});

test("renames only the selected project, preserving IDs, task data and order through remount", () => {
  const original = sampleDocument();
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(original));
  const view = render(<ProjectTracker />);
  fireEvent.click(projectButton("Studio operations"));
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  expect(nameInput()).toHaveValue("Studio operations");
  expect(nameInput()).toHaveFocus();
  enterName("  Renamed  ");
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename project" })).toHaveFocus();
  expect(stored()).toEqual({
    ...original,
    projects: [
      original.projects[0],
      { ...original.projects[1], name: "Renamed" },
    ],
  });
  view.unmount();
  render(<ProjectTracker />);
  expect(
    screen.getByRole("heading", { name: "Northstar website" }),
  ).toBeVisible();
  fireEvent.click(projectButton("Renamed"));
  expect(screen.getByRole("heading", { name: "Renamed" })).toBeVisible();
});

test.each(["Cancel", "Escape"])(
  "%s cancels rename, discards draft and returns focus to its opener",
  (action) => {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(sampleDocument()));
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    render(<ProjectTracker />);
    fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
    enterName("Unsaved");
    if (action === "Escape")
      fireEvent(
        screen.getByRole("dialog"),
        new Event("cancel", { bubbles: false, cancelable: true }),
      );
    else fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
    expect(
      screen.getByRole("button", { name: "Rename project" }),
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
    expect(nameInput()).toHaveValue("Northstar website");
  },
);

test.each(["create", "rename"])(
  "failed %s preserves bytes, canonical identity, draft and input focus, then retries",
  (mode) => {
    const original = sampleDocument();
    const raw = JSON.stringify(original);
    localStorage.setItem(TRACKER_STORAGE_KEY, raw);
    let blocked = true;
    const storage = createTrackerStorage(() => ({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => {
        if (blocked) throw new DOMException("Quota", "QuotaExceededError");
        localStorage.setItem(key, value);
      },
    }));
    render(<ProjectTracker storage={storage} />);
    if (mode === "create") openNew();
    else
      fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
    enterName("My saved project");
    nameInput().focus();
    fireEvent.submit(nameInput().closest("form")!);
    expect(nameInput()).toHaveValue("My saved project");
    expect(nameInput()).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t be saved/);
    expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
    expect(
      screen.getByRole("heading", { name: "Northstar website" }),
    ).toBeInTheDocument();
    blocked = false;
    fireEvent.submit(nameInput().closest("form")!);
    if (mode === "create")
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("heading", { name: "My saved project" }),
    ).toBeVisible();
    expect(stored().tasks).toEqual(original.tasks);
  },
);

test("blocked storage exposes no project mutation controls", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, "{broken");
  render(<ProjectTracker />);
  expect(
    screen.queryByRole("button", { name: "New project" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Rename project" }),
  ).not.toBeInTheDocument();
});

test("cancelled creation makes no write; reopening starts with a fresh draft", () => {
  render(<ProjectTracker />);
  fireEvent.click(
    screen.getByRole("button", { name: "Create your first project" }),
  );
  enterName("Unsaved new project");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Create your first project" }),
  ).toHaveFocus();
  openNew();
  expect(nameInput()).toHaveValue("");
});

test("newly created project is selected, survives remount, and reload uses the first project", () => {
  const view = render(<ProjectTracker />);
  create("First");
  enterName("Second");
  fireEvent.click(screen.getByRole("button", { name: "Create project" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("heading", { name: "Second" })).toBeVisible();
  expect(projectButton("Second")).toHaveAttribute("aria-current", "page");
  view.unmount();
  render(<ProjectTracker />);
  expect(screen.getByRole("heading", { name: "First" })).toBeVisible();
  expect(projectButton("Second")).toBeVisible();
});

test.each(["   ", "x".repeat(201)])(
  "rename rejects invalid names without changing accepted bytes",
  (name) => {
    const raw = JSON.stringify(sampleDocument());
    localStorage.setItem(TRACKER_STORAGE_KEY, raw);
    render(<ProjectTracker />);
    fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
    enterName(name);
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
  },
);
