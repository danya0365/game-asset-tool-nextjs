"use client";

export interface ProjectData {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  // Tilemap data
  tilemap?: {
    name: string;
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
    layers: {
      id: string;
      name: string;
      visible: boolean;
      opacity: number;
      data: number[][];
      type: string;
    }[];
    tilesets: {
      name: string;
      imageUrl: string;
      tileWidth: number;
      tileHeight: number;
      columns: number;
      rows: number;
    }[];
  };
  // Spritesheet data
  spritesheet?: {
    imageUrl: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    animations: {
      id: string;
      name: string;
      frameIds: string[];
      loop: boolean;
    }[];
  };
  // Settings
  settings?: {
    theme: string;
    defaultExportFormat: string;
  };
}

const PROJECT_VERSION = "1.0.0";
const STORAGE_KEY = "game-asset-tool-projects";
const RECENT_PROJECTS_KEY = "game-asset-tool-recent";

export interface RecentProject {
  name: string;
  path: string;
  updatedAt: string;
}

// Get recent projects list
export function getRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Add to recent projects
export function addToRecentProjects(project: RecentProject) {
  if (typeof window === "undefined") return;
  const recent = getRecentProjects();
  const filtered = recent.filter((p) => p.name !== project.name);
  filtered.unshift(project);
  localStorage.setItem(
    RECENT_PROJECTS_KEY,
    JSON.stringify(filtered.slice(0, 10))
  );
}

// Save project to file (download)
export function saveProjectToFile(
  projectName: string,
  data: Partial<ProjectData>
) {
  const project: ProjectData = {
    version: PROJECT_VERSION,
    name: projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}.gat`;
  a.click();
  URL.revokeObjectURL(url);

  // Add to recent
  addToRecentProjects({
    name: projectName,
    path: `${projectName}.gat`,
    updatedAt: new Date().toISOString(),
  });

  return project;
}

// Load project from file
export async function loadProjectFromFile(
  file: File
): Promise<ProjectData | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ProjectData;

    // Validate project format
    if (!data.version || !data.name) {
      throw new Error("Invalid project format");
    }

    // Add to recent
    addToRecentProjects({
      name: data.name,
      path: file.name,
      updatedAt: new Date().toISOString(),
    });

    return data;
  } catch (error) {
    console.error("Failed to load project:", error);
    return null;
  }
}

// Auto-save to localStorage
export function autoSaveProject(
  projectName: string,
  data: Partial<ProjectData>
) {
  if (typeof window === "undefined") return;

  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  projects[projectName] = {
    version: PROJECT_VERSION,
    name: projectName,
    createdAt: projects[projectName]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// Load auto-saved project
export function loadAutoSavedProject(projectName: string): ProjectData | null {
  if (typeof window === "undefined") return null;

  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return projects[projectName] || null;
}

// Get list of auto-saved projects
export function getAutoSavedProjects(): string[] {
  if (typeof window === "undefined") return [];

  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return Object.keys(projects);
}

// Delete auto-saved project
export function deleteAutoSavedProject(projectName: string) {
  if (typeof window === "undefined") return;

  const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  delete projects[projectName];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
