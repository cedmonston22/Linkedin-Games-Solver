import type { PatchesSolution, ClickCellResponse } from "../../types";

/**
 * Sends a mouse event to the background worker via Chrome Debugger API.
 */
function sendMouseEvent(
  type: string,
  x: number,
  y: number
): Promise<ClickCellResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "MOUSE_EVENT", eventType: type, x, y },
      (response: ClickCellResponse) => {
        resolve(response);
      }
    );
  });
}

function getCellCenter(
  idx: number
): { x: number; y: number } | null {
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
 * Injects the Patches solution by dragging from the clue cell
 * to define each rectangle region.
 *
 * For each region, we drag from the clue cell to the opposite corner
 * of the rectangle.
 */
export async function injectPatchesSolution(
  solution: PatchesSolution,
  size: number,
  clues: { row: number; col: number }[]
): Promise<void> {
  for (let i = 0; i < clues.length; i++) {
    const clue = clues[i]!;
    const rect = solution.rects[i]!;

    const clueIdx = clue.row * size + clue.col;
    const clueCenter = getCellCenter(clueIdx);
    if (!clueCenter) continue;

    // Determine the corner opposite to the clue cell within the rectangle
    // Drag from clue cell to that corner
    let targetRow: number;
    let targetCol: number;

    // If clue is at top of rect, drag to bottom; if at bottom, drag to top
    if (clue.row === rect.top) {
      targetRow = rect.top + rect.height - 1;
    } else {
      targetRow = rect.top;
    }

    if (clue.col === rect.left) {
      targetCol = rect.left + rect.width - 1;
    } else {
      targetCol = rect.left;
    }

    const targetIdx = targetRow * size + targetCol;
    const targetCenter = getCellCenter(targetIdx);
    if (!targetCenter) continue;

    // Drag from clue to opposite corner
    await sendMouseEvent("mousePressed", clueCenter.x, clueCenter.y);
    await new Promise((r) => setTimeout(r, 50));
    await sendMouseEvent("mouseMoved", targetCenter.x, targetCenter.y);
    await new Promise((r) => setTimeout(r, 50));
    await sendMouseEvent("mouseReleased", targetCenter.x, targetCenter.y);
    await new Promise((r) => setTimeout(r, 100));
  }
}
