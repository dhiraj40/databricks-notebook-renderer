export const DATABRICKS_NOTEBOOK_HEADER = "# Databricks notebook source";

export const DATABRICKS_COMMAND_SEPARATOR = "# COMMAND ----------";

export const DATABRICKS_MAGIC_PREFIX = "# MAGIC";
    "# MAGIC";

export type DatabricksSourceCellKind = "code" | "markdown";

export interface DatabricksSourceCell {
    kind: DatabricksSourceCellKind;
    languageId: string;
    source: string;
}