import type { QueensSolution, ClickCellResponse } from "../../types";

/**
 * Sends a click request to the background worker, which uses the
 * Chrome Debugger API to dispatch a trusted mouse event.
 */
function sendClick(x: number, y: number): Promise<ClickCellResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "CLICK_CELL", x, y },
      (response: ClickCellResponse) => {
        setTimeout(() => resolve(response), 200);
      }
    );
  });
}

/**
 * Gets the center coordinates of a cell element in viewport space.
 */
function getCellCenter(
  row: number,
  col: number,
  size: number
): { x: number; y: number } | null {
  const idx = row * size + col;
  const cell = document.querySelector<HTMLElement>(
    `[data-testid="cell-${idx}"]`
  );
  if (!cell) return null;
  const rect = cell.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
}

/**
 * Injects the Queens solution into the LinkedIn DOM.
 * Each queen position requires TWO clicks via the debugger:
 * first click = X marker, second click = Queen.
 */
export async function injectQueensSolution(
  solution: QueensSolution,
  size: number
): Promise<void> {
  for (const queen of solution.queens) {
    // First click: places X marker
    const center1 = getCellCenter(queen.row, queen.col, size);
    if (center1) await sendClick(center1.x, center1.y);

    // Second click: places queen
    const center2 = getCellCenter(queen.row, queen.col, size);
    if (center2) await sendClick(center2.x, center2.y);
  }
}
