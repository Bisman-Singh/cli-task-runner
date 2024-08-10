import { exec } from "child_process";
import chalk from "chalk";
import { TaskDefinition } from "./parser";

export interface TaskResult {
  name: string;
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
}

const COLORS = [
  chalk.cyan,
  chalk.magenta,
  chalk.yellow,
  chalk.blue,
  chalk.green,
  chalk.red,
];

function getColor(index: number): typeof chalk.cyan {
  return COLORS[index % COLORS.length];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

function runCommand(
  command: string,
  env?: Record<string, string>,
  cwd?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const mergedEnv = { ...process.env, ...env };

    exec(command, { env: mergedEnv, cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const exitCode = error ? (error.code ?? 1) : 0;
      resolve({
        exitCode,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}

export async function runTasks(
  tasks: TaskDefinition[],
  options: { verbose?: boolean } = {}
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  const verbose = options.verbose ?? false;

  console.log(chalk.bold(`\n  Running ${tasks.length} task(s)...\n`));

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const color = getColor(i);
    const prefix = color(`[${task.name}]`);

    const depInfo =
      task.dependencies && task.dependencies.length > 0
        ? chalk.gray(` (after: ${task.dependencies.join(", ")})`)
        : "";

    console.log(`  ${prefix} ${chalk.bold("Starting")}${depInfo}`);

    if (task.description) {
      console.log(`  ${prefix} ${chalk.gray(task.description)}`);
    }

    console.log(`  ${prefix} ${chalk.gray(`$ ${task.command}`)}`);

    const startTime = Date.now();
    const { exitCode, stdout, stderr } = await runCommand(
      task.command,
      task.env,
      task.cwd
    );
    const durationMs = Date.now() - startTime;

    if (verbose && stdout.trim()) {
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        console.log(`  ${prefix} ${chalk.gray(line)}`);
      }
    }

    if (stderr.trim()) {
      const lines = stderr.trim().split("\n");
      for (const line of lines) {
        console.log(`  ${prefix} ${chalk.yellow(line)}`);
      }
    }

    const result: TaskResult = {
      name: task.name,
      success: exitCode === 0,
      exitCode,
      durationMs,
      stdout,
      stderr,
    };

    if (exitCode !== 0) {
      result.error = `Exited with code ${exitCode}`;
      console.log(
        `  ${prefix} ${chalk.red.bold("FAILED")} ${chalk.gray(`(${formatDuration(durationMs)})`)}`
      );
      results.push(result);

      // Stop execution on failure
      console.log(chalk.red(`\n  Task "${task.name}" failed. Stopping execution.\n`));
      break;
    }

    console.log(
      `  ${prefix} ${chalk.green.bold("DONE")} ${chalk.gray(`(${formatDuration(durationMs)})`)}`
    );
    console.log("");

    results.push(result);
  }

  return results;
}

export function printSummary(results: TaskResult[]): void {
  console.log(chalk.bold("  Summary:\n"));

  const maxNameLen = Math.max(...results.map((r) => r.name.length));

  for (const result of results) {
    const icon = result.success ? chalk.green("PASS") : chalk.red("FAIL");
    const name = result.name.padEnd(maxNameLen);
    const duration = chalk.gray(formatDuration(result.durationMs));
    console.log(`  ${icon} ${name}  ${duration}`);
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log("");
  console.log(chalk.gray(`  Total: ${results.length} task(s), `) +
    chalk.green(`${passed} passed`) +
    (failed > 0 ? chalk.red(`, ${failed} failed`) : "") +
    chalk.gray(` in ${formatDuration(totalTime)}`)
  );
  console.log("");
}
