# Databricks Notebook Renderer

VS Code extension for opening Databricks source notebooks as notebook documents, running them locally or on Databricks clusters, and previewing Databricks-style rich outputs.

## Features

- Opens Databricks `.py` source notebooks in notebook UI.
- Parses and preserves Databricks notebook markers such as `# Databricks notebook source`, `# COMMAND ----------`, `# DBTITLE`, and `%md` / `%sql` / `%scala` / `%python` / `%r` / `%sh`.
- Saves notebook edits back to Databricks source format.
- Supports local execution for Python, SQL, shell, and Scala when those runtimes are available on your machine.
- Discovers Databricks clusters through the Databricks CLI and exposes them in the notebook kernel picker.
- Runs cells remotely on the selected Databricks cluster through Databricks command execution APIs.
- Expands notebook-relative Python `%run` files for local execution.
- Leaves `%run` unchanged for remote Databricks execution.
- Adds a side-by-side Python source preview so you can inspect the generated Databricks source before saving.
- Renders `x-application/custom-json-output` with a richer Databricks-style panel for summaries, metrics, logs, and tables.

## Setup

### Prerequisites

- Node.js and npm
- VS Code
- Optional for remote execution: Databricks CLI installed and authenticated

### Install dependencies

```powershell
npm install
```

### Run the extension locally

1. Open this repo in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. In the launched window, open `example/abcd.py`.
4. Use `Reopen Editor With...` and choose `Databricks Notebook`.

## Using The Extension

### Local execution

1. Open a Databricks notebook.
2. In the kernel picker, choose `Local Auto`.
3. Run Python, SQL, shell, or Scala cells against runtimes available on your machine.

### Remote execution on Databricks clusters

1. Install and configure the Databricks CLI.
2. Verify cluster discovery works:

```powershell
databricks clusters list --output json
```

3. Open the notebook in VS Code.
4. Choose a Databricks cluster from the notebook kernel picker.
5. Run `Databricks Notebook: Refresh Clusters` if the cluster list needs to be refreshed.

### Preview generated Python source

Use `Databricks Notebook: Preview Python Source` from the Command Palette or the notebook toolbar to open a side-by-side preview of the current notebook serialized back into Databricks Python source.

## Commands

- `Databricks Notebook: Refresh Clusters`
- `Databricks Notebook: Preview Python Source`

## Settings

- `databricksNotebookRenderer.databricksCliPath`: path to the Databricks CLI executable. Default: `databricks`
- `databricksNotebookRenderer.databricksProfile`: optional Databricks CLI profile for cluster discovery and execution
- `databricksNotebookRenderer.databricksCommandTimeoutSeconds`: max wait time for remote Databricks execution. Default: `120`

## Remote Execution Notes

- Remote execution currently targets Databricks classic clusters discovered from the Databricks CLI.
- Python, SQL, and Scala run directly in Databricks command contexts.
- Shell cells run through a Python command context that invokes `bash -lc` on the cluster driver.
- Notebook serverless compute is not discovered by `databricks clusters list`, so it is not part of this extension's cluster picker flow.

## Custom Output Payload

The rich output renderer works best with JSON shaped like this:

```json
{
  "title": "Revenue by region",
  "subtitle": "warehouse: analytics-prod",
  "status": "success",
  "summary": "Query finished successfully and returned a preview of the result set.",
  "metrics": [
    { "label": "Rows", "value": 5 },
    { "label": "Runtime", "value": "842 ms" }
  ],
  "logs": [
    "Attached to SQL warehouse analytics-prod",
    "Result limited to 5 rows for preview"
  ],
  "table": {
    "columns": ["region", "orders", "revenue"],
    "rows": [
      ["North America", 1240, "$2.4M"],
      ["EMEA", 980, "$1.9M"]
    ]
  }
}
```

The renderer also falls back gracefully for plain strings, arrays of objects, simple key/value objects, and raw JSON.

## Development

```powershell
npm run compile
npm run lint
npm test
```

## CI/CD Publish

This repo includes a GitHub Actions workflow at `.github/workflows/extension-ci-publish.yml`.

### What it does

- Runs install and tests on pull requests and pushes to `main` and `release`
- Builds a `.vsix` package artifact
- Publishes to the Visual Studio Marketplace when code is pushed to `release` and the publish environment is approved

### Required GitHub secret

- `VSCE_PAT`: Visual Studio Marketplace Personal Access Token for your publisher

### Required GitHub environment

- Create a GitHub Environment named `marketplace-publish`
- Add required reviewers to that environment
- Keep `VSCE_PAT` available to the workflow as a repository secret
- The publish job will wait for approval before it runs

### Publish flow

1. Update the version in `package.json`
2. Merge the approved PR into `release`
3. GitHub Actions runs CI and pauses at the `marketplace-publish` environment approval
4. Approve the environment deployment
5. The workflow publishes the extension

```powershell
git checkout release
git merge <your-pr-branch>
git push origin release
```

The workflow will package the extension and publish it from CI after approval.

## Project Structure

- `src/extension/extension.ts`: extension activation, kernel registration, and commands
- `src/extension/notebookSerializer.ts`: Databricks source notebook parsing, serialization, and source preview generation
- `src/extension/kernel/`: local and Databricks execution environments
- `src/client/render.ts`: output renderer webview logic
- `src/client/style.css`: renderer styling
