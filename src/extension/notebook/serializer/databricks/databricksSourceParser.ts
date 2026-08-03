import { 
    DATABRICKS_CELL_TITLE, 
    DATABRICKS_COMMAND_SEPARATOR, 
    DATABRICKS_NOTEBOOK_HEADER, 
    DatabricksSourceCell, 
    DatabricksSourceCellKind } from "./databricksSourceFormat";


class DatabricksSourceCellBuilder {
    public kind = DatabricksSourceCellKind.Code;
    public languageId = "python";
    public title?: string;
    public readonly sourceLines: string[] = [];
}

export class DatabricksSourceParser  {

    public parse(source: string): DatabricksSourceCell[] {
        const cellSources = this.parseSourceCells(this.normalizeSource(source));
        return cellSources.map(cellSource => this.parseCell(cellSource));
    }

    private normalizeSource(source: string): string {
        return source
            .replace(/^\uFEFF/, "")
            .replace(/\r\n?/g, "\n");
    }

    private splitIntoCellSources(source: string): string[] {
        const lines = source.split("\n");
        if (lines.length > 0 && lines[0].trim() === DATABRICKS_NOTEBOOK_HEADER) {
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

    private parseSourceCells(source: string): DatabricksSourceCellBuilder[] {
        const lines = source.split('\n');
        const cells: DatabricksSourceCellBuilder[] = [new DatabricksSourceCellBuilder()];
        let currentCellIndex = 0;

        for(let index = 0; index < lines.length; index++){
            const line = lines[index];

            if(index === 0 && line.trim() === DATABRICKS_NOTEBOOK_HEADER){
                continue;
            }
            if(line.trim() === DATABRICKS_COMMAND_SEPARATOR){
                cells.push(new DatabricksSourceCellBuilder());
                currentCellIndex = cells.length - 1;
                continue;
            }
            const titleMatch = line.match(/^# DBTITLE 1,(.*)$/);
            if(titleMatch){
                cells[currentCellIndex].title = titleMatch[1];
                continue;
            }

            const magicMatch = line.match(/^# MAGIC(?: ?(.*))?$/);
            if(magicMatch){
                this.applyMagicLine(cells[currentCellIndex], magicMatch[1] ?? "");
                continue;
            }

            cells[currentCellIndex].sourceLines.push(line);
        }

        const lastCell = cells[cells.length - 1];

        if (
            lastCell &&
            !lastCell.title &&
            lastCell.sourceLines.length === 0
        ) {
            cells.pop();
        }

        return cells

    }

    private applyMagicLine(cell: DatabricksSourceCellBuilder, magicLine: string): void {

        const magicDirective = magicLine.match(/^%(md|markdown|python|sql|scala|r)\b(.*)$/i);
        if (!magicDirective) {
            cell.sourceLines.push(magicLine);
            return;
        }

        const language = magicDirective[1].toLowerCase();
        const inlineSource = magicDirective[2].trimStart();

        if (language === "md" || language === "markdown") {
            cell.kind = DatabricksSourceCellKind.Markdown;
            cell.languageId = "markdown";
        } else {
            cell.kind = DatabricksSourceCellKind.Code;
            cell.languageId = language;
        }

        if (inlineSource.length > 0) {
            cell.sourceLines.push(inlineSource);
        }
    }

    private parseCell(cellBuilder: DatabricksSourceCellBuilder): DatabricksSourceCell {
        return {
            kind: cellBuilder.kind,
            languageId: cellBuilder.languageId,
            source: this.cleanCellSource(cellBuilder.sourceLines.join("\n")),
            title: cellBuilder.title
        }
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
                kind: DatabricksSourceCellKind.Markdown,
                languageId: "markdown",
                source: source
            };
        }

        return {
            kind: DatabricksSourceCellKind.Code,
            languageId: magic,
            source: source
        };
    }
}