import type { QueensSolution } from "../../types";

/**
 * Simulates a mousedown event on an element.
 * archivedqueens.com responds to mousedown, not click.
 */
function simulateMousedown(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
}

/**
 * Gets a cell element by row and column from the archived board.
 */
function getCell(row: number, col: number, size: number): HTMLElement | null {
  const board = document.querySelector<HTMLElement>(".board");
  if (!board) return null;
  return (board.children[row * size + col] as HTMLElement) ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Injects the Queens solution into archivedqueens.com.
 * Uses mousedown events (no debugger needed).
 * Each cell needs TWO mousedowns: first = X marker, second = queen.
 */
export async function injectArchivedSolution(
  solution: QueensSolution,
  size: number
): Promise<void> {
  for (const queen of solution.queens) {
    const cell = getCell(queen.row, queen.col, size);
    if (cell) {
      // First mousedown: places X
      simulateMousedown(cell);
      await delay(100);
      // Second mousedown: places queen
      simulateMousedown(cell);
      await delay(100);
    }
  }
}
