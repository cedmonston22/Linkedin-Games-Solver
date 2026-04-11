import type { QueensBoard } from "../../types";

/**
 * Parses the Queens board from archivedqueens.com.
 * The site uses a CSS grid of plain divs with inline background-color.
 * Grid size is read from grid-template-columns: repeat(N, 1fr).
 * Regions are determined by matching background-color values.
 */
export function parseArchivedBoard(): QueensBoard | null {
  const board = document.querySelector<HTMLElement>(".board");
  if (!board) return null;

  // Get grid size from inline style
  const cols = board.style.gridTemplateColumns;
  // Format: "repeat(7, 1fr)" -- extract the number
  const sizeMatch = cols.match(/repeat\((\d+)/);
  if (!sizeMatch) return null;
  const size = parseInt(sizeMatch[1]!, 10);

  const cells = board.children;
  if (cells.length !== size * size) return null;

  const colorToRegion = new Map<string, number>();
  let nextRegionId = 0;
  const regions: number[][] = [];

  for (let r = 0; r < size; r++) {
    regions[r] = [];
    for (let c = 0; c < size; c++) {
      const cell = cells[r * size + c] as HTMLElement;
      const bg = cell.style.backgroundColor;
      if (!colorToRegion.has(bg)) {
        colorToRegion.set(bg, nextRegionId++);
      }
      regions[r]![c] = colorToRegion.get(bg)!;
    }
  }

  return { size, regions };
}
