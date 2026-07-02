# cli-task-runner

A CLI tool that reads tasks from a YAML file, resolves dependencies via topological sort, and runs them in the correct order with colorful output and timing.

## Features

- Reads task definitions from a `tasks.yaml` file
- Each task has a name, command, optional dependencies, environment variables, and description
- Resolves dependency graph using topological sort (Kahn's algorithm)
- Detects circular dependencies
- Runs tasks in correct dependency order
- Stops on first failure
- Colorful terminal output with per-task timing
- Run a single task and its dependencies with `--task`
- List all tasks without running with `--list`

## Installation

```bash
npm install
npm run build
```

## Usage

Create a `tasks.yaml` file:

```yaml
tasks:
  - name: install
    command: npm install
    description: Install project dependencies

  - name: lint
    command: npm run lint
    dependencies: [install]
    description: Run linter

  - name: build
    command: npm run build
    dependencies: [install]
    description: Build the project

  - name: test
    command: npm test
    dependencies: [build]
    description: Run test suite
    env:
      NODE_ENV: test
      CI: "true"

  - name: deploy
    command: echo "Deploying..."
    dependencies: [test, lint]
    description: Deploy the application
```

Run all tasks:

```bash
npx task-runner
```

Run a specific task (and its dependencies):

```bash
npx task-runner --task test
```

List available tasks:

```bash
npx task-runner --list
```

Use a different file:

```bash
npx task-runner --file ci-tasks.yaml
```

Verbose output (show stdout from each task):

```bash
npx task-runner --verbose
```

## Task Definition

| Field          | Type     | Required | Description                           |
|----------------|----------|----------|---------------------------------------|
| `name`         | string   | Yes      | Unique task identifier                |
| `command`      | string   | Yes      | Shell command to execute              |
| `dependencies` | string[] | No       | Task names that must run first        |
| `env`          | object   | No       | Environment variables for the command |
| `description`  | string   | No       | Human-readable description            |
| `cwd`          | string   | No       | Working directory for the command     |



<sub><sup>Originally developed and tested locally during learning. Later organized and pushed to GitHub for portfolio visibility.</sup></sub>
