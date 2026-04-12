import type { ZipSolution, ClickCellResponse } from "../../types";

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

export async function injectZipSolution(
  solution: ZipSolution,
  size: number
): Promise<void> {
  if (solution.path.length === 0) return;

  const first = solution.path[0]!;
  const startCenter = getCellCenter(first.row, first.col, size);
  if (!startCenter) return;

  await sendMouseEvent("mousePressed", startCenter.x, startCenter.y);
  await new Promise((r) => setTimeout(r, 50));

  for (let i = 1; i < solution.path.length; i++) {
    const pos = solution.path[i]!;
    const center = getCellCenter(pos.row, pos.col, size);
    if (center) {
      await sendMouseEvent("mouseMoved", center.x, center.y);
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  const last = solution.path[solution.path.length - 1]!;
  const endCenter = getCellCenter(last.row, last.col, size);
  if (endCenter) {
    await sendMouseEvent("mouseReleased", endCenter.x, endCenter.y);
  }
}
