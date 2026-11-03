import { beforeEach, describe, expect, test, vi } from "vitest";
import type { TrackerDocument } from "./projectTracker.types";
import { sampleDocument } from "./testFixtures";
import { createTrackerStorage, TRACKER_STORAGE_KEY } from "./trackerStorage";

beforeEach(() => localStorage.clear());

test("missing storage is empty without writing a document", () => {
  const setItem = vi.fn();
  const storage = createTrackerStorage(() => ({
    getItem: () => null,
    setItem,
  }));
  expect(storage.load()).toEqual({ kind: "missing" });
  expect(setItem).not.toHaveBeenCalled();
});

test("round-trips complete ordered data through actual localStorage", () => {
  const first = createTrackerStorage();
  const document = sampleDocument();
  expect(first.commit(document)).toEqual({ ok: true });
  expect(JSON.parse(localStorage.getItem(TRACKER_STORAGE_KEY)!)).toEqual(
    document,
  );
  expect(createTrackerStorage().load()).toEqual({ kind: "valid", document });
});

test("classifies malformed JSON without overwriting it", () => {
  localStorage.setItem(TRACKER_STORAGE_KEY, "{broken");
  expect(createTrackerStorage().load()).toMatchObject({ kind: "malformed" });
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe("{broken");
});

test("preserves unsupported schemas and distinguishes them from malformed data", () => {
  const raw = JSON.stringify({ schemaVersion: 2, future: true });
  localStorage.setItem(TRACKER_STORAGE_KEY, raw);
  expect(createTrackerStorage().load()).toMatchObject({ kind: "unsupported" });
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
});

const invalidDocuments: [string, unknown][] = [
  ["null", null],
  ["array", []],
  ["missing version", {}],
  ["string version", { ...sampleDocument(), schemaVersion: "1" }],
  ["missing projects", { schemaVersion: 1, tasks: [] }],
  ["invalid task collection", { ...sampleDocument(), tasks: null }],
  [
    "blank name",
    { schemaVersion: 1, projects: [{ id: "p", name: " " }], tasks: [] },
  ],
  [
    "untrimmed name",
    { schemaVersion: 1, projects: [{ id: "p", name: " Name " }], tasks: [] },
  ],
  [
    "long name",
    {
      schemaVersion: 1,
      projects: [{ id: "p", name: "x".repeat(201) }],
      tasks: [],
    },
  ],
  [
    "empty ID",
    { schemaVersion: 1, projects: [{ id: "", name: "Name" }], tasks: [] },
  ],
  [
    "duplicate projects",
    {
      ...sampleDocument(),
      projects: [sampleDocument().projects[0], sampleDocument().projects[0]],
    },
  ],
  [
    "duplicate tasks",
    {
      ...sampleDocument(),
      tasks: [sampleDocument().tasks[0], sampleDocument().tasks[0]],
    },
  ],
  [
    "cross-entity duplicate ID",
    {
      ...sampleDocument(),
      tasks: [{ ...sampleDocument().tasks[0], id: "project-1" }],
    },
  ],
  [
    "orphan task",
    {
      ...sampleDocument(),
      tasks: [{ ...sampleDocument().tasks[0], projectId: "missing" }],
    },
  ],
  [
    "invalid status",
    {
      ...sampleDocument(),
      tasks: [{ ...sampleDocument().tasks[0], status: "Finished" }],
    },
  ],
  [
    "empty title",
    {
      ...sampleDocument(),
      tasks: [{ ...sampleDocument().tasks[0], title: "" }],
    },
  ],
  [
    "long title",
    {
      ...sampleDocument(),
      tasks: [{ ...sampleDocument().tasks[0], title: "x".repeat(201) }],
    },
  ],
];

describe.each(invalidDocuments)(
  "invalid stored document: %s",
  (_name, value) => {
    test("rejects on load without changing stored bytes", () => {
      const raw = JSON.stringify(value);
      localStorage.setItem(TRACKER_STORAGE_KEY, raw);
      expect(createTrackerStorage().load()).toMatchObject({
        kind: "malformed",
      });
      expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(raw);
    });
    test("rejects on commit before any write", () => {
      const setItem = vi.fn();
      const storage = createTrackerStorage(() => ({
        getItem: () => null,
        setItem,
      }));
      expect(storage.commit(value as TrackerDocument)).toMatchObject({
        ok: false,
        reason: "invalid-document",
      });
      expect(setItem).not.toHaveBeenCalled();
    });
  },
);

test("accepts the 200-character boundary and duplicate names/titles", () => {
  const document: TrackerDocument = {
    schemaVersion: 1,
    projects: [
      { id: "p1", name: "x".repeat(200) },
      { id: "p2", name: "x".repeat(200) },
    ],
    tasks: [
      { id: "t1", projectId: "p1", title: "y".repeat(200), status: "To Do" },
      { id: "t2", projectId: "p2", title: "y".repeat(200), status: "Done" },
    ],
  };
  expect(createTrackerStorage().commit(document)).toEqual({ ok: true });
  expect(createTrackerStorage().load()).toEqual({ kind: "valid", document });
});

test("handles blocked storage access and read exceptions without exposing exception details", () => {
  for (const access of [
    () => {
      throw new Error("secret access details");
    },
    () => ({
      getItem: () => {
        throw new Error("secret read details");
      },
      setItem: vi.fn(),
    }),
  ]) {
    const result = createTrackerStorage(access).load();
    expect(result).toMatchObject({ kind: "unreadable" });
    expect(JSON.stringify(result)).not.toContain("secret");
  }
});

test("failed writes preserve previous bytes and permit a later successful retry", () => {
  const original = JSON.stringify(sampleDocument());
  localStorage.setItem(TRACKER_STORAGE_KEY, original);
  let blocked = true;
  const storage = createTrackerStorage(() => ({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => {
      if (blocked) throw new DOMException("secret quota", "QuotaExceededError");
      localStorage.setItem(key, value);
    },
  }));
  const empty: TrackerDocument = { schemaVersion: 1, projects: [], tasks: [] };
  const result = storage.commit(empty);
  expect(result).toMatchObject({ ok: false, reason: "write-failed" });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(localStorage.getItem(TRACKER_STORAGE_KEY)).toBe(original);
  blocked = false;
  expect(storage.commit(empty)).toEqual({ ok: true });
  expect(storage.load()).toEqual({ kind: "valid", document: empty });
});
