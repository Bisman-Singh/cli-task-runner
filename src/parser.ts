import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface TaskDefinition {
  name: string;
  command: string;
  dependencies?: string[];
  env?: Record<string, string>;
  description?: string;
  cwd?: string;
}

export interface TaskFile {
  tasks: TaskDefinition[];
}

export function parseTaskFile(filePath: string): TaskDefinition[] {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Task file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Task file must contain a YAML object");
  }

  const taskFile = parsed as Record<string, unknown>;

  if (!Array.isArray(taskFile.tasks)) {
    throw new Error('Task file must have a "tasks" array at the top level');
  }

  const tasks: TaskDefinition[] = [];

  for (let i = 0; i < taskFile.tasks.length; i++) {
    const entry = taskFile.tasks[i] as Record<string, unknown>;

    if (!entry.name || typeof entry.name !== "string") {
      throw new Error(`Task at index ${i} must have a "name" string`);
    }

    if (!entry.command || typeof entry.command !== "string") {
      throw new Error(`Task "${entry.name}" must have a "command" string`);
    }

    const task: TaskDefinition = {
      name: entry.name,
      command: entry.command,
    };

    if (entry.dependencies) {
      if (!Array.isArray(entry.dependencies)) {
        throw new Error(`Task "${entry.name}" dependencies must be an array`);
      }
      task.dependencies = entry.dependencies.map(String);
    }

    if (entry.env) {
      if (typeof entry.env !== "object" || Array.isArray(entry.env)) {
        throw new Error(`Task "${entry.name}" env must be an object`);
      }
      task.env = {};
      for (const [key, value] of Object.entries(entry.env as Record<string, unknown>)) {
        task.env[key] = String(value);
      }
    }

    if (entry.description && typeof entry.description === "string") {
      task.description = entry.description;
    }

    if (entry.cwd && typeof entry.cwd === "string") {
      task.cwd = entry.cwd;
    }

    tasks.push(task);
  }

  // Validate that all dependency references exist
  const taskNames = new Set(tasks.map((t) => t.name));
  for (const task of tasks) {
    for (const dep of task.dependencies || []) {
      if (!taskNames.has(dep)) {
        throw new Error(
          `Task "${task.name}" depends on "${dep}", which does not exist`
        );
      }
    }
  }

  return tasks;
}
