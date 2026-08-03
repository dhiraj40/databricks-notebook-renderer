import { DatabricksTableColumn } from "../models/executionResult";

export class TableOutputFormatter {
    public static toHtmlTable(schema: DatabricksTableColumn[], data: any[]): string {
        if (!data || data.length === 0) {
            return "<p>No data available</p>";
        }

        const rows = data.map(row => (
            "<tr>" +
            Object.values(row).map(value => `<td>${this.escapeHtml(String(value ?? ""))}</td>`).join("") +
            "</tr>"
        )).join("");
        const headers = schema.map(column => `<th>${this.escapeHtml(column.name)}</th>`).join("");

        return `<table border="1"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    private static escapeHtml(
        value: string
    ): string {

        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}