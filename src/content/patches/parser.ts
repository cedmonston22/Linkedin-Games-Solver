import type { PatchesBoard, PatchesClue, PatchesShape } from "../../types";

/**
 * Reads the Patches game board from the LinkedIn DOM.
 *
 * Clue cells have aria-labels like:
 *   "Row 4, column 3, tall rectangle clue, 4 cells"
 *   "Row 5, column 6, freeform clue, 9 cells"
 */
const CLUE_REGEX =
  /Row (\d+), column (\d+), (.+?) clue, (\d+) cells/;

function parseShape(shapeText: string): PatchesShape {
  if (shapeText === "square") return "square";
  if (shapeText === "tall rectangle") return "tall";
  if (shapeText === "wide rectangle") return "wide";
  return "any"; // "freeform"
}

export function parsePatchesBoard(): PatchesBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );
  if (!grid) return null;

  const style = grid.getAttribute("style") ?? "";
  const sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) return null;
  const size = parseInt(sizeMatch[1]!, 10);

  const cells = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  if (cells.length !== size * size) return null;

  const clues: PatchesClue[] = [];

  cells.forEach((cell) => {
    const ariaLabel = cell.getAttribute("aria-label") ?? "";
    const match = CLUE_REGEX.exec(ariaLabel);
    if (!match) return;

    const row = parseInt(match[1]!, 10) - 1; // 1-based to 0-based
    const col = parseInt(match[2]!, 10) - 1;
    const shape = parseShape(match[3]!);
    const area = parseInt(match[4]!, 10);

    clues.push({ row, col, area, shape });
  });

  if (clues.length === 0) return null;

  return { size, clues };
}
