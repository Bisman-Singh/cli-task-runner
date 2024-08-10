#!/usr/bin/env node

import chalk from "chalk";
import { parseTaskFile } from "./parser";
import { resolveOrder } from "./resolver";
import { runTasks, printSummary } from "./runner";

function printUsage(): void {
  console.log(`
${chalk.bold("cli-task-runner")} - Run tasks from a YAML file with dependency resolution

${chalk.bold("Usage:")}
  task-runner [options]

${chalk.bold("Options:")}
  --file <path>     Path to tasks file (default: tasks.yaml)
  --task <name>     Run only this task and its dependencies
  --list            List all tasks without running them
  --verbose         Show task stdout in output
  --help            Show this help message

${chalk.bold("Example tasks.yaml:")}
  tasks:
    - name: install
      command: npm install
      description: Install dependencies

    - name: build
      command: npm run build
      dependencies: [install]

    - name: test
      command: npm test
      dependencies: [build]
      env:
        NODE_ENV: test
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let filePath = "tasks.yaml";
  let targetTask: string | null = null;
  let listOnly = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":
        filePath = args[++i];
        break;
      case "--task":
        targetTask = args[++i];
        break;
      case "--list":
        listOnly = true;
        break;
      case "--verbose":
        verbose = true;
        break;
    }
  }

  console.log(chalk.bold("\n  CLI Task Runner\n"));

  try {
    const tasks = parseTaskFile(filePath);
    console.log(chalk.gray(`  File: ${filePath}`));
    console.log(chalk.gray(`  Tasks found: ${tasks.length}\n`));

    if (listOnly) {
      console.log(chalk.bold("  Available tasks:\n"));
      for (const task of tasks) {
        const deps =
          task.dependencies && task.dependencies.length > 0
            ? chalk.gray(` -> depends on: ${task.dependencies.join(", ")}`)
            : "";
        console.log(`  ${chalk.cyan(task.name)}${deps}`);
        if (task.description) {
          console.log(`    ${chalk.gray(task.description)}`);
        }
        console.log(`    ${chalk.gray(`$ ${task.command}`)}`);
        console.log("");
      }
      process.exit(0);
    }

    let tasksToRun = tasks;

    if (targetTask) {
      const targetExists = tasks.find((t) => t.name === targetTask);
      if (!targetExists) {
        console.error(chalk.red(`  Error: Task "${targetTask}" not found.\n`));
        console.log(chalk.gray("  Available tasks: " + tasks.map((t) => t.name).join(", ") + "\n"));
        process.exit(1);
      }
    }

    const resolved = resolveOrder(tasksToRun);

    if (targetTask) {
      // Filter to only include the target task and its dependencies
      const needed = new Set<string>();

      function collectDeps(name: string): void {
        if (needed.has(name)) return;
        needed.add(name);
        const task = tasks.find((t) => t.name === name);
        if (task?.dependencies) {
          for (const dep of task.dependencies) {
            collectDeps(dep);
          }
        }
      }

      collectDeps(targetTask);
      tasksToRun = resolved.filter((t) => needed.has(t.name));
    } else {
      tasksToRun = resolved;
    }

    console.log(chalk.bold("  Execution order:"));
    tasksToRun.forEach((t, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${t.name}`));
    });

    const results = await runTasks(tasksToRun, { verbose });
    printSummary(results);

    const failed = results.some((r) => !r.success);
    process.exit(failed ? 1 : 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\n  Error: ${message}\n`));
    process.exit(1);
  }
}

main();
