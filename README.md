# Databricks Notebook Renderer

VS Code extension starter for opening Databricks source notebooks and rendering custom notebook outputs with a Databricks-inspired look.

## What It Does

- Opens Databricks-style `.py` source notebooks as notebook documents.
- Parses real Databricks markers such as:
  - `# Databricks notebook source`
  - `# COMMAND ----------`
  - `# DBTITLE 1,...`
  - `# MAGIC %md`, `%sql`, `%scala`, `%python`, `%r`, `%sh`
- Round-trips language-specific cells back to Databricks source format when the notebook is saved.
- Renders `x-application/custom-json-output` output items with a richer result panel for summaries, metrics, logs, and tables.

## Quick Start

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Open the repo in VS Code.
3. Press `F5` to launch the extension development host.
4. Open `example/abcd.py` with `Reopen Editor With...` and select `Databricks Notebook`.
5. Open `example/notebook.ipynb` to preview the custom output renderer.

## Output Payload Shape

The custom renderer looks best when the output JSON resembles this shape:

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

## Project Structure

- `src/extension/extension.ts` registers the notebook serializer.
- `src/extension/notebookSerializer.ts` handles Databricks source notebook parsing and saving.
- `src/client/render.ts` renders notebook outputs inside the webview.
- `src/client/style.css` defines the Databricks-inspired renderer UI.

## Commands

```powershell
npm run compile
npm run lint
npm test
```
