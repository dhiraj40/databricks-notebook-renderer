# Databricks Notebook Renderer — Release 2.0

Release 2.0 brings a more complete Databricks notebook experience directly inside Visual Studio Code. You can connect to Databricks, select compute, open supported notebook files, execute cells on a Databricks cluster, and view execution output without leaving VS Code.

## What’s New

### Databricks Connection

You can now connect your VS Code workspace to Databricks using your workspace URL and access token.

Once connected, the extension validates your credentials and stores them securely using VS Code Secret Storage.

### Compute Selection

You can select a Databricks compute target from VS Code.

The selected compute is remembered for the workspace, so you do not need to select it again every time you restart VS Code.

### Notebook Cell Execution

Notebook cells can now be executed directly on Databricks compute.

Supported languages:

- Python
- SQL
- Scala
- R

The extension creates and reuses a Databricks execution session for each notebook and language combination.

### Databricks Source Notebook Support

Release 2.0 adds support for Databricks source-style Python notebooks.

Supported file types:

- `.dbnb`
- `.py`

Databricks source notebooks using markers such as the following can now be opened as notebooks:

```python
# Databricks notebook source
# COMMAND ----------
# MAGIC %md
```

### Markdown and Magic Cell Support

The extension can detect Databricks magic commands in source notebooks, including markdown cells.

Examples:

```python
# MAGIC %md
# MAGIC ## My Markdown Cell
```

```python
# MAGIC %sql
# MAGIC SELECT * FROM table_name
```

### Rich Output Improvements

Notebook output rendering has been improved.

Supported output types include:

- Text output
- Error output
- HTML output
- Table output

Databricks table results are rendered as tables in VS Code notebook output.

### Databricks Sidebar

A new Databricks sidebar view helps you see the current extension state.

The sidebar shows:

- Connection status
- Selected compute
- Active notebook sessions
- Notebook language sessions

## How to Use

### 1. Connect to Databricks

Run the command:

```text
Databricks Notebook Renderer: Connect
```

Enter your Databricks workspace URL and access token when prompted.

### 2. Select Compute

Run the command:

```text
Databricks Notebook Renderer: Select Compute
```

Choose the cluster where notebook cells should run.

### 3. Open a Notebook

Open a supported notebook file:

```text
.dbnb
.py
```

For Databricks source Python notebooks, choose the Databricks notebook editor when VS Code asks how to open the file.

### 4. Run Cells

Use the notebook cell run button or VS Code notebook shortcuts to execute cells.

Cells are executed on the selected Databricks compute.

### 5. Disconnect

Run the command:

```text
Databricks Notebook Renderer: Disconnect
```

This clears the active connection and session state.

## Notes and Limitations

### `.ipynb` Files

Standard `.ipynb` files are still handled by the normal VS Code/Jupyter notebook experience.

The extension does not replace the default Jupyter serializer for `.ipynb` files.

### `%run` Support

The `%run` magic command is not fully supported yet from local VS Code execution because relative notebook paths require a Databricks workspace notebook path.

### Serverless Compute

This release focuses on Databricks cluster-backed execution. Serverless notebook compute is not exposed yet.

### Local Folder Mounting

Local folders are not mounted directly into Databricks runtime. Code and files need to be available to Databricks through supported workspace, DBFS, or volume-based workflows.

## Summary

Release 2.0 turns the extension into a usable Databricks notebook workflow inside VS Code:

- Connect to Databricks
- Select compute
- Open Databricks notebooks
- Execute notebook cells remotely
- View text, error, HTML, and table output
- Track connection, compute, and sessions from the sidebar

