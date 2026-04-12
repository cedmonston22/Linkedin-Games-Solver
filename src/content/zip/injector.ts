import type { ZipSolution, ClickCellResponse } from "../../types";

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

/**
 * Gets the center coordinates of a cell element in viewport space.
 */
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
 * Injects the Zip solution by simulating a drag gesture along the path.
 *
 * Zip requires dragging through cells in order. We simulate:
 * 1. mousePressed on the first cell
 * 2. mouseMoved through each subsequent cell
 * 3. mouseReleased on the last cell
 */
export async function injectZipSolution(
  solution: ZipSolution,
  size: number
): Promise<void> {
  if (solution.path.length === 0) return;

  const first = solution.path[0]!;
  const firstIdx = first.row * size + first.col;
  const startCenter = getCellCenter(firstIdx);
  if (!startCenter) return;

  // Mouse down on first cell
  await sendMouseEvent("mousePressed", startCenter.x, startCenter.y);

  // Small delay to let the game register the press
  await new Promise((r) => setTimeout(r, 50));

  // Move through each subsequent cell
  for (let i = 1; i < solution.path.length; i++) {
    const pos = solution.path[i]!;
    const idx = pos.row * size + pos.col;
    const center = getCellCenter(idx);
    if (!center) continue;

    await sendMouseEvent("mouseMoved", center.x, center.y);
    // Small delay between moves so the game can process each cell
    await new Promise((r) => setTimeout(r, 30));
  }

  // Mouse up on last cell
  const last = solution.path[solution.path.length - 1]!;
  const lastIdx = last.row * size + last.col;
  const endCenter = getCellCenter(lastIdx);
  if (endCenter) {
    await sendMouseEvent("mouseReleased", endCenter.x, endCenter.y);
  }
}
