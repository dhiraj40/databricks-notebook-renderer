import { DATABRICKS_COMMAND_SEPARATOR, DATABRICKS_NOTEBOOK_HEADER, DatabricksSourceCell } from "./databricksSourceFormat";

export class DatabricksSourceParser  {

    public parse(source: string): DatabricksSourceCell[] {
        // Implementation will go here
        return [];
    }

    private normalizeSource(source: string): string {
        return source
            .replace(/^\uFEFF/, "")
            .replace(/\r\n?/g, "\n");
    }

    private splitIntoCellSources(source: string): string[] {
        const lines = source.split("\n");
        if (lines.length === 0 && lines[0].trim() === DATABRICKS_NOTEBOOK_HEADER) {
            lines.shift();
        }

        const cells: string[][] = [[]];
        let currentCell = cells[0];

        for(const line of lines){
            if(line.trim() === DATABRICKS_COMMAND_SEPARATOR){
                currentCell = [];
                cells.push(currentCell);
                continue;
            }
            currentCell.push(line);
        }
        return cells.map(cell => this.cleanCellSource(cell.join("\n")));
    }

    private parseCell(source: string): DatabricksSourceCell {
        const magicLines = this.decodeMagicLines(source);
        if (!magicLines) {
            return {
                kind: "code",
                languageId: "python",
                source: source
            };
        }

        const magicCell = this.parseMagicDirective(magicLines);
        if (magicCell) {
            return magicCell;
        }

        return {
            kind: "code",
            languageId: "python",
            source: magicLines.join("\n")
        };
    }

    private cleanCellSource(source: string): string {
        return source
            .replace(/^\n/, "")
            .replace(/\n$/, "");
    }

    private decodeMagicLines(source: string): string[] | undefined {
        const lines = source.split("\n");
        const decodeLines: string[] = [];

        for(const line of lines){
            const match = line.match(/^\s*# MAGIC(?: ?(.*))?$/);
            if(!match){
                return undefined;
            }
            decodeLines.push(match[1] ?? "");
        }
        return decodeLines;
    }

    private parseMagicDirective(lines: string[]): DatabricksSourceCell | undefined {

        const firstLine = lines[0] ?? "";
        const match = firstLine.match(/^%(md|markdown|python|sql|scala|r)\b(.*)$/i);

        if (!match) {
            return undefined;
        }

        const magic = match[1].toLowerCase();
        const inlineContent = match[2].replace(/^\s+/, "");
        const contentLines = lines.slice(1);

        if(inlineContent.length > 0){
            contentLines.unshift(inlineContent);
        }
        const source = contentLines.join("\n");

        if(magic === "md" || magic === "markdown"){
            return {
                kind: "markdown",
                languageId: "markdown",
                source: source
            };
        }

        return {
            kind: "code",
            languageId: magic,
            source: source
        };
    }
}