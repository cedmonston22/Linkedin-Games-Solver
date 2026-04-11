import type { QueensBoard } from "../../types";

/**
 * Parses the aria-label of a Queens cell.
 * Formats:
 *   "Empty cell of color Pastel Green, row 6, column 2"
 *   "Queen of color Soft Blue, row 7, column 8"  (no "cell" when queen is placed)
 */
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

/**
 * Reads the Queens game board from the LinkedIn DOM.
 * Uses aria-labels on each cell to extract color, row, and column.
 */
export function parseQueensBoard(): QueensBoard | null {
  const cells = document.querySelectorAll<HTMLElement>(
    '[data-testid="interactive-grid"] [data-testid^="cell-"]'
  );

  if (cells.length === 0) {
    console.error("[LinkedIn Solver] No cells found on the board");
    return null;
  }

  // Parse all cells and determine grid size
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

  if (maxRow !== maxCol || maxRow === 0) {
    console.error("[LinkedIn Solver] Board is not square or is empty");
    return null;
  }

  const size = maxRow;

  // Map color names to numeric region IDs
  const colorToRegion = new Map<string, number>();
  let nextRegionId = 0;

  // Build the 2D regions array (0-indexed)
  const regions: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(-1)
  );

  for (const cell of parsedCells) {
    if (!colorToRegion.has(cell.color)) {
      colorToRegion.set(cell.color, nextRegionId++);
    }
    const regionId = colorToRegion.get(cell.color)!;
    // aria-labels use 1-based rows/cols, our array is 0-based
    regions[cell.row - 1]![cell.col - 1] = regionId;
  }

  // Verify all cells were filled
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r]![c] === -1) {
        console.error(`[LinkedIn Solver] Missing cell at row ${r + 1}, col ${c + 1}`);
        return null;
      }
    }
  }

  console.log(`[LinkedIn Solver] Parsed ${size}x${size} board with ${colorToRegion.size} regions`);
  return { size, regions };
}
