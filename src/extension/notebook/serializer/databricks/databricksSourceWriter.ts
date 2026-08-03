import { DATABRICKS_COMMAND_SEPARATOR, DATABRICKS_NOTEBOOK_HEADER, DatabricksSourceCell, DatabricksSourceCellKind } from "./databricksSourceFormat";

export class DatabricksSourceWriter {
    public write(cells: DatabricksSourceCell[]): string {
        const cellSources = cells.map(cell => this.writeCell(cell))
        const join_separator = `\n\n${DATABRICKS_COMMAND_SEPARATOR}\n\n`;
        const cellBody = cellSources.join(join_separator) + "\n";

        return DATABRICKS_NOTEBOOK_HEADER + "\n" + cellBody;
    }

    private writeCell(cell: DatabricksSourceCell): string {
        const source = this.normalizeCellSource(cell.source);
        const languageId = cell.languageId.toLocaleLowerCase();        
        if(languageId !== 'python'){
            let directive = (cell.kind === DatabricksSourceCellKind.Markdown) ? "%md" : `%${languageId}`;
            return this.writeMagicCell(
                directive, 
                source
            );
        }
        return source;
    }

    private normalizeCellSource(source: string): string {
        return source
            .replace(/\r\n?/g, "\n")
            .replace(/\n$/, "");
    }

    private writeMagicCell(directive: string, source: string): string {
        const magicDirective = `# MAGIC ${directive}`;
        const magicSource = source.split("\n").map(line => `# MAGIC ${line}`).join("\n");
        return `${magicDirective}\n${magicSource}`;
    }   
}