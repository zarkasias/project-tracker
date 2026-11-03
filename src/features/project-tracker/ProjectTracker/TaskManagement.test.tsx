import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ProjectTracker } from "./ProjectTracker";
import type { TrackerDocument } from "../projectTracker.types";
import { createTrackerStorage, TRACKER_STORAGE_KEY } from "../trackerStorage";

function documentFixture(): TrackerDocument {
  return {
    schemaVersion: 1,
    projects: [
      { id: "p1", name: "First" },
      { id: "p2", name: "Second" },
    ],
    tasks: [
      { id: "a", projectId: "p1", title: "Alpha", status: "To Do" },
      { id: "b", projectId: "p1", title: "Bravo", status: "In Progress" },
      { id: "c", projectId: "p1", title: "Charlie", status: "Done" },
      { id: "d", projectId: "p2", title: "Other project", status: "To Do" },
    ],
  };
}
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(documentFixture()));
});
const bytes = () => localStorage.getItem(TRACKER_STORAGE_KEY)!;
const stored = (): TrackerDocument => JSON.parse(bytes());
const row = (name: string) => screen.getByRole("listitem", { name });
const edit = (name: string) =>
  screen.getByRole("button", { name: `Edit ${name}` });
const remove = (name: string) =>
  screen.getByRole("button", { name: `Delete ${name}` });
const titleInput = () => screen.getByRole("textbox", { name: "Task title" });
const newInput = () => screen.getByRole("textbox", { name: "New task" });
function change(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}
function openCreation() {
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
}
function create(title: string) {
  openCreation();
  change(newInput(), title);
  fireEvent.submit(newInput().closest("form")!);
}
function filter(name: string) {
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Filter tasks by status" }),
    ).getByRole("button", { name }),
  );
}

// Assertions target the real feature and storage; only external failures/confirmation are controlled.
test("creates a trimmed To Do task with UUID, retaining cleared creation input focus", () => {
  render(<ProjectTracker />);
  create("  New work  ");
  expect(stored().tasks.at(-1)).toEqual({
    id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    projectId: "p1",
    title: "New work",
    status: "To Do",
  });
  expect(row("New work")).toBeVisible();
  expect(newInput()).toHaveValue("");
  expect(newInput()).toHaveFocus();
  expect(stored().tasks[3]).toEqual(documentFixture().tasks[3]);
});
test.each(["  ", "x".repeat(201)])(
  "creation validation preserves bytes and associates/focuses the invalid field: %s",
  (title) => {
    const raw = bytes();
    render(<ProjectTracker />);
    create(title);
    expect(bytes()).toBe(raw);
    expect(newInput()).toHaveFocus();
    expect(newInput()).toHaveAttribute("aria-invalid", "true");
    expect(newInput()).toHaveAccessibleDescription(/required|200/);
    expect(screen.getByRole("alert")).toBeVisible();
  },
);
test("accepts 200-character titles and duplicates with distinct IDs", () => {
  render(<ProjectTracker />);
  create("x".repeat(200));
  change(newInput(), "x".repeat(200));
  fireEvent.submit(newInput().closest("form")!);
  expect(
    stored()
      .tasks.slice(-2)
      .map((task) => task.title),
  ).toEqual(["x".repeat(200), "x".repeat(200)]);
  expect(stored().tasks.at(-1)?.id).not.toBe(stored().tasks.at(-2)?.id);
});
test.each([
  ["All", ["Alpha", "Bravo", "Charlie"]],
  ["To Do", ["Alpha"]],
  ["In Progress", ["Bravo"]],
  ["Done", ["Charlie"]],
] as const)("filter %s derives selected-project rows", (value, names) => {
  render(<ProjectTracker />);
  filter(value);
  expect(
    screen.getAllByRole("listitem").map((el) => el.getAttribute("aria-label")),
  ).toEqual(names);
  expect(
    screen.queryByRole("listitem", { name: "Other project" }),
  ).not.toBeInTheDocument();
});
test("creation through an active filter stays To Do without clearing the filter", () => {
  render(<ProjectTracker />);
  filter("Done");
  create("Hidden until To Do");
  expect(newInput()).toHaveFocus();
  expect(
    screen.queryByRole("listitem", { name: "Hidden until To Do" }),
  ).not.toBeInTheDocument();
  expect(stored().tasks.at(-1)?.status).toBe("To Do");
  filter("To Do");
  expect(row("Hidden until To Do")).toBeVisible();
});
test("save and cancel edit return focus to Edit; rename/status changes preserve identity and order", () => {
  render(<ProjectTracker />);
  fireEvent.click(edit("Alpha"));
  expect(titleInput()).toHaveFocus();
  change(titleInput(), "  Revised  ");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(edit("Revised")).toHaveFocus();
  expect(stored().tasks[0]).toEqual({
    ...documentFixture().tasks[0],
    title: "Revised",
  });
  fireEvent.click(edit("Revised"));
  change(titleInput(), "Unsaved");
  fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
  expect(edit("Revised")).toHaveFocus();
  expect(stored().tasks[0].title).toBe("Revised");
});
test.each([" ", "x".repeat(201)])(
  "invalid edit retains draft, original task and invalid field focus",
  (value) => {
    const raw = bytes();
    render(<ProjectTracker />);
    fireEvent.click(edit("Alpha"));
    change(titleInput(), value);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(bytes()).toBe(raw);
    expect(titleInput()).toHaveValue(value);
    expect(titleInput()).toHaveFocus();
  },
);
test("accepted edit removed by status filter focuses the task-list heading", () => {
  render(<ProjectTracker />);
  filter("To Do");
  fireEvent.click(edit("Alpha"));
  change(screen.getByRole("combobox", { name: "Task status" }), "Done");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("heading", { name: "Project tasks" })).toHaveFocus();
  expect(
    screen.queryByRole("listitem", { name: "Alpha" }),
  ).not.toBeInTheDocument();
  expect(stored().tasks[0].status).toBe("Done");
});
test("all native status values persist; removing a row from a filter restores heading focus", () => {
  render(<ProjectTracker />);
  for (const value of ["In Progress", "Done", "To Do"]) {
    change(screen.getByRole("combobox", { name: "Status for Alpha" }), value);
    expect(stored().tasks[0].status).toBe(value);
  }
  filter("To Do");
  change(screen.getByRole("combobox", { name: "Status for Alpha" }), "Done");
  expect(screen.getByRole("heading", { name: "Project tasks" })).toHaveFocus();
});
test("switching projects discards task drafts and resets filter to All, keeping selector focus", () => {
  render(<ProjectTracker />);
  filter("To Do");
  fireEvent.click(edit("Alpha"));
  change(titleInput(), "Unsaved");
  const second = within(
    screen.getByRole("navigation", { name: "Projects" }),
  ).getByRole("button", { name: "Second" });
  fireEvent.click(second);
  expect(second).toHaveFocus();
  expect(
    screen.queryByRole("textbox", { name: "Task title" }),
  ).not.toBeInTheDocument();
  expect(row("Other project")).toBeVisible();
  expect(
    within(
      screen.getByRole("group", { name: "Filter tasks by status" }),
    ).getByRole("button", { name: "All" }),
  ).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Projects" })).getByRole(
      "button",
      { name: "First" },
    ),
  );
  expect(row("Alpha")).toBeVisible();
  expect(stored().tasks[0].title).toBe("Alpha");
});
test("empty project differs from a filter with no matching tasks", () => {
  render(<ProjectTracker />);
  filter("Done");
  change(screen.getByRole("combobox", { name: "Status for Charlie" }), "To Do");
  expect(screen.getByText("No tasks in this view.")).toBeVisible();
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Projects" })).getByRole(
      "button",
      { name: "Second" },
    ),
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(remove("Other project"));
  expect(screen.getByText("A clear slate for your next step.")).toBeVisible();
});
test("cancelled native deletion preserves bytes and Delete focus (mocked confirmation only)", () => {
  const raw = bytes();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<ProjectTracker />);
  fireEvent.click(remove("Alpha"));
  expect(bytes()).toBe(raw);
  expect(remove("Alpha")).toHaveFocus();
});
test.each([
  ["Bravo", "Charlie"],
  ["Charlie", "Bravo"],
])(
  "confirmed deletion of %s focuses adjacent visible Edit %s",
  (name, next) => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectTracker />);
    fireEvent.click(remove(name));
    expect(edit(next)).toHaveFocus();
    expect(screen.queryByRole("listitem", { name })).not.toBeInTheDocument();
  },
);
test("deleting the last filtered task focuses Add task and leaves other projects intact", () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<ProjectTracker />);
  filter("Done");
  fireEvent.click(remove("Charlie"));
  expect(screen.getByRole("button", { name: "Add task" })).toHaveFocus();
  expect(stored().tasks.at(-1)).toEqual(documentFixture().tasks.at(-1));
});
test.each(["create", "edit", "status", "delete"] as const)(
  "failed %s preserves bytes/canonical state/draft/focus, then retries",
  (action) => {
    const raw = bytes();
    let blocked = true;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const storage = createTrackerStorage(() => ({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => {
        if (blocked) throw new Error("quota");
        localStorage.setItem(key, value);
      },
    }));
    render(<ProjectTracker storage={storage} />);
    const run = () => {
      if (action === "create" || action === "edit")
        fireEvent.submit(
          (action === "create" ? newInput() : titleInput()).closest("form")!,
        );
      else if (action === "status")
        change(
          screen.getByRole("combobox", { name: "Status for Alpha" }),
          "Done",
        );
      else fireEvent.click(remove("Alpha"));
    };
    if (action === "create") {
      openCreation();
      change(newInput(), "Keep this draft");
      newInput().focus();
    }
    if (action === "edit") {
      fireEvent.click(edit("Alpha"));
      change(titleInput(), "Keep this draft");
      titleInput().focus();
    }
    if (action === "status")
      screen.getByRole("combobox", { name: "Status for Alpha" }).focus();
    run();
    expect(bytes()).toBe(raw);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t be saved/);
    if (action === "create" || action === "edit") {
      expect(action === "create" ? newInput() : titleInput()).toHaveValue(
        "Keep this draft",
      );
      expect(action === "create" ? newInput() : titleInput()).toHaveFocus();
    }
    if (action === "status") {
      expect(
        screen.getByRole("combobox", { name: "Status for Alpha" }),
      ).toHaveValue("To Do");
      expect(
        screen.getByRole("combobox", { name: "Status for Alpha" }),
      ).toHaveFocus();
    }
    if (action === "delete") expect(remove("Alpha")).toHaveFocus();
    blocked = false;
    run();
    expect(bytes()).not.toBe(raw);
    expect(stored().tasks.find((task) => task.id === "d")).toEqual(
      documentFixture().tasks[3],
    );
  },
);
test("accepted mutations survive remount with first-project/All initialization", () => {
  const view = render(<ProjectTracker />);
  create("Saved task");
  fireEvent.click(edit("Alpha"));
  change(titleInput(), "Saved title");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  change(
    screen.getByRole("combobox", { name: "Status for Saved title" }),
    "Done",
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(remove("Bravo"));
  filter("Done");
  view.unmount();
  render(<ProjectTracker />);
  expect(row("Saved title")).toBeVisible();
  expect(row("Saved task")).toBeVisible();
  expect(
    screen.queryByRole("listitem", { name: "Bravo" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: "Status for Saved title" }),
  ).toHaveValue("Done");
});

test("active edit protects its draft while other row mutations are disabled", () => {
  render(<ProjectTracker />);
  fireEvent.click(edit("Alpha"));
  change(titleInput(), "Keep draft");
  expect(remove("Bravo")).toBeDisabled();
  expect(edit("Charlie")).toBeDisabled();
  expect(
    screen.getByRole("combobox", { name: "Status for Bravo" }),
  ).toBeDisabled();
  expect(titleInput()).toHaveValue("Keep draft");
  fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
  expect(remove("Bravo")).toBeEnabled();
  expect(edit("Alpha")).toHaveFocus();
});
test("failed deletion preserves an unrelated creation draft and confirms again on retry", () => {
  const raw = bytes();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const storage = createTrackerStorage(() => ({
    getItem: (key) => localStorage.getItem(key),
    setItem: () => {
      throw new Error("quota");
    },
  }));
  render(<ProjectTracker storage={storage} />);
  openCreation();
  change(newInput(), "Retain me");
  fireEvent.click(remove("Alpha"));
  expect(bytes()).toBe(raw);
  expect(newInput()).toHaveValue("Retain me");
  expect(remove("Alpha")).toHaveFocus();
  fireEvent.click(remove("Alpha"));
  expect(confirm).toHaveBeenCalledTimes(2);
});
