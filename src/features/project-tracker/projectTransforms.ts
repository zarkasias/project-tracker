import type { Project, TrackerDocument } from "./projectTracker.types";

export function validateProjectName(value: string): string | null {
  const name = value.trim();
  if (!name) return "A project name is required.";
  if (name.length > 200)
    return "Use 200 characters or fewer for the project name.";
  return null;
}

export function addProject(
  document: TrackerDocument,
  project: Project,
): TrackerDocument {
  return { ...document, projects: [...document.projects, project] };
}

export function renameProject(
  document: TrackerDocument,
  id: string,
  name: string,
): TrackerDocument {
  return {
    ...document,
    projects: document.projects.map((project) =>
      project.id === id ? { ...project, name } : project,
    ),
  };
}
