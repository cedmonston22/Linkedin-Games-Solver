import type { QueensBoard } from "../../types";

const CELL_LABEL_REGEX =
  /^(.+?) (?:cell )?of color (.+), row (\d+), column (\d+)$/;

interface ParsedCell {
  state: string;
  color: string;
  row: number;
  col: number;
}

function parseCellLabel(label: string): ParsedCell | null {
  const match = CELL_LABEL_REGEX.exec(label);
  if (!match) return null;

  return {
    state: match[1]!,
    color: match[2]!,
    row: parseInt(match[3]!, 10),
    col: parseInt(match[4]!, 10),
  };
}

export function parseQueensBoard(): QueensBoard | null {
  const cells = document.querySelectorAll<HTMLElement>(
    '[data-testid="interactive-grid"] [data-testid^="cell-"]'
  );

  if (cells.length === 0) return null;

  const parsedCells: ParsedCell[] = [];
  let maxRow = 0;
  let maxCol = 0;

  for (const cell of cells) {
    const label = cell.getAttribute("aria-label");
    if (!label) continue;

    const parsed = parseCellLabel(label);
    if (!parsed) continue;

    parsedCells.push(parsed);
    maxRow = Math.max(maxRow, parsed.row);
    maxCol = Math.max(maxCol, parsed.col);
  }

  if (parsedCells.length === 0 || maxRow !== maxCol || maxRow === 0) {
    return null;
  }

  const size = maxRow;
  const colorToRegion = new Map<string, number>();
  let nextRegionId = 0;

  const regions: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(-1)
  );

  for (const cell of parsedCells) {
    if (!colorToRegion.has(cell.color)) {
      colorToRegion.set(cell.color, nextRegionId++);
    }
    const regionId = colorToRegion.get(cell.color)!;
    regions[cell.row - 1]![cell.col - 1] = regionId;
  }

  return { size, regions };
}
