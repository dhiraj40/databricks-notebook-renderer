# Databricks Notebook Renderer

A VS Code extension for connecting to Databricks, selecting a classic cluster, and running notebook cells remotely.

## Current features

- Opens `*.dbnb` files in the VS Code notebook editor.
- Stores notebook cells as JSON with their language and source value.
- Connects to a Databricks workspace using its URL and a personal access token (PAT).
- Stores connection credentials in VS Code Secret Storage.
- Lists available classic Databricks clusters and persists the selected cluster for the workspace.
- Executes Python cells remotely through the Databricks command-execution API.
- Reuses a remote command context for each notebook and language combination.
- Cleans up active command contexts when disconnecting.
- Shows Databricks connection and selected-compute status in the activity-bar view and VS Code status bar.
- Displays text and error cell output in the notebook editor.
- Includes a notebook output renderer that formats JSON output in a code block.

## Planned: Databricks Python source notebooks

Support for Databricks `*.py` source notebooks is planned before release. This will include recognizing the Databricks source header and cell separators, opening the file as a notebook, and serializing edits back to Databricks Python source format.

Until that work is complete, `*.dbnb` is the supported notebook file format.

## Prerequisites

- Node.js 20 or later
- npm
- VS Code 1.101 or later
- A Databricks workspace and personal access token
- Access to a running classic Databricks cluster for remote execution

## Development setup

```powershell
npm install
npm run compile
```

Press `F5` in VS Code to start an Extension Development Host.

## Using the extension

1. In the Extension Development Host, open a `*.dbnb` file.
2. Open the **Databricks** activity-bar view.
3. Select **Connect** and enter the workspace URL and personal access token.
4. Select **Select Compute**, then choose a Databricks cluster.
5. Run a Python cell in the notebook editor.

The extension creates a remote Python command context the first time a notebook cell runs and reuses it for later cells in the same notebook. Selecting **Disconnect** closes active contexts and removes the saved connection credentials.

## Commands

- `Databricks Notebook Renderer: Connect`
- `Databricks Notebook Renderer: Disconnect`
- `Databricks Notebook Renderer: Select Compute`

## Configuration

The extension currently has no required settings. Connection credentials are requested interactively and are stored securely by VS Code. The selected compute ID is stored in workspace state.

## Development commands

```powershell
npm run compile
npm run lint
npm test
```

## Project structure

- `src/extension/extension.ts` - extension activation and service wiring
- `src/extension/databricks/` - Databricks APIs, authentication, compute, sessions, and execution services
- `src/extension/notebook/` - notebook serialization, execution, output, and session-context handling
- `src/extension/ui/` - Databricks sidebar and status-bar UI
- `src/client/` - notebook output renderer webview client

## Limitations

- Only Python cell execution is currently registered by the notebook controller.
- Remote execution uses classic Databricks clusters and command contexts.
- The custom renderer currently presents JSON as formatted text; richer Databricks-style visual output is not yet implemented.

## License

[MIT](LICENSE)
