import { TaskDefinition } from "./parser";

/**
 * Performs topological sort on tasks based on their dependencies.
 * Returns tasks in the order they should be executed.
 * Throws an error if a circular dependency is detected.
 */
export function resolveOrder(tasks: TaskDefinition[]): TaskDefinition[] {
  const taskMap = new Map<string, TaskDefinition>();
  for (const task of tasks) {
    taskMap.set(task.name, task);
  }

  // Build adjacency list: task -> tasks that depend on it
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const task of tasks) {
    graph.set(task.name, new Set());
    inDegree.set(task.name, 0);
  }

  for (const task of tasks) {
    for (const dep of task.dependencies || []) {
      graph.get(dep)!.add(task.name);
      inDegree.set(task.name, (inDegree.get(task.name) || 0) + 1);
    }
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  for (const [name, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const sorted: TaskDefinition[] = [];

  while (queue.length > 0) {
    // Sort the queue to ensure deterministic ordering
    queue.sort();
    const current = queue.shift()!;
    sorted.push(taskMap.get(current)!);

    for (const dependent of graph.get(current)!) {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  if (sorted.length !== tasks.length) {
    // Find the tasks involved in the cycle
    const sortedNames = new Set(sorted.map((t) => t.name));
    const cycleNodes = tasks
      .filter((t) => !sortedNames.has(t.name))
      .map((t) => t.name);

    throw new Error(
      `Circular dependency detected among tasks: ${cycleNodes.join(", ")}`
    );
  }

  return sorted;
}

/**
 * Get all tasks that a given task depends on (transitively).
 */
export function getDependencyChain(
  taskName: string,
  tasks: TaskDefinition[]
): string[] {
  const taskMap = new Map<string, TaskDefinition>();
  for (const task of tasks) {
    taskMap.set(task.name, task);
  }

  const visited = new Set<string>();
  const chain: string[] = [];

  function visit(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const task = taskMap.get(name);
    if (!task) return;

    for (const dep of task.dependencies || []) {
      visit(dep);
    }

    if (name !== taskName) {
      chain.push(name);
    }
  }

  visit(taskName);
  return chain;
}
