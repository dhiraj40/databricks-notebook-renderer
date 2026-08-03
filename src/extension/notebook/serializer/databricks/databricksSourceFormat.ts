export const DATABRICKS_NOTEBOOK_HEADER = "# Databricks notebook source";

export const DATABRICKS_COMMAND_SEPARATOR = "# COMMAND ----------";

export const DATABRICKS_MAGIC_PREFIX = "# MAGIC";
export const DATABRICKS_CELL_TITLE = "# DBTITLE 1"

export enum DatabricksSourceCellKind {
    Code = "code",
    Markdown = "markdown"
}
export interface DatabricksSourceCell {
    kind: DatabricksSourceCellKind;
    languageId: string;
    source: string;
    title?: string;
}