import type { TangoSolution, TangoValue, ClickCellResponse } from "../../types";

function sendClick(x: number, y: number): Promise<ClickCellResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "CLICK_CELL", x, y },
      (response: ClickCellResponse) => {
        setTimeout(() => resolve(response), 150);
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

export async function injectTangoSolution(
  solution: TangoSolution,
  size: number,
  initialGrid: (TangoValue | null)[][]
): Promise<void> {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (initialGrid[row]![col] !== null) continue;

      const target = solution.grid[row]![col]!;
      const idx = row * size + col;

      // Read current value from DOM
      const cellEl = document.querySelector<HTMLElement>(
        `[data-testid="cell-${idx}"]`
      );
      let current: TangoValue | null = null;
      if (cellEl) {
        const svg = cellEl.querySelector<SVGElement>(
          'svg[aria-label="Sun"], svg[aria-label="Moon"]'
        );
        if (svg) {
          const lbl = svg.getAttribute("aria-label");
          if (lbl === "Sun") current = "sun";
          else if (lbl === "Moon") current = "moon";
        }
      }

      let clicks = 0;
      if (current === null) clicks = target === "sun" ? 1 : 2;
      else if (current === "sun") clicks = target === "sun" ? 0 : 1;
      else clicks = target === "moon" ? 0 : 2;

      const center = getCellCenter(idx);
      if (!center) continue;

      for (let i = 0; i < clicks; i++) {
        await sendClick(center.x, center.y);
      }
    }
  }
}
