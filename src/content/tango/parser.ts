import type { TangoBoard, TangoValue, TangoConstraint } from "../../types";

export function parseTangoBoard(): TangoBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );
  if (!grid) return null;

  const style = grid.getAttribute("style") ?? "";
  const sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) return null;
  const size = parseInt(sizeMatch[1]!, 10);

  // Filter to game cells only (exclude "How to play" example cells)
  const allCells = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  const cells: HTMLElement[] = [];
  for (const c of allCells) {
    if (/^cell-\d+$/.test(c.getAttribute("data-testid") ?? "")) cells.push(c);
  }
  if (cells.length !== size * size) return null;

  const boardGrid: (TangoValue | null)[][] = Array.from({ length: size }, () =>
    new Array<TangoValue | null>(size).fill(null)
  );
  const constraints: TangoConstraint[] = [];

  for (const cell of cells) {
    const testId = cell.getAttribute("data-testid") ?? "";
    const idxMatch = testId.match(/cell-(\d+)/);
    if (!idxMatch) continue;
    const idx = parseInt(idxMatch[1]!, 10);
    const row = Math.floor(idx / size);
    const col = idx % size;

    // Read cell value from SVG aria-label
    const svgs = cell.querySelectorAll<SVGElement>("svg[aria-label]");
    for (const svg of svgs) {
      const label = svg.getAttribute("aria-label");
      if (label === "Sun") boardGrid[row]![col] = "sun";
      else if (label === "Moon") boardGrid[row]![col] = "moon";
    }

    // Read constraint markers (Equal/Cross SVGs on edge elements)
    const edgeSvgs = cell.querySelectorAll<SVGElement>(
      'svg[aria-label="Equal"], svg[aria-label="Cross"]'
    );
    for (const edgeSvg of edgeSvgs) {
      const edgeLabel = edgeSvg.getAttribute("aria-label")!;
      const type: "same" | "different" =
        edgeLabel === "Equal" ? "same" : "different";

      const edgeParent = edgeSvg.parentElement;
      if (!edgeParent) continue;

      // Detect direction from edge position relative to cell
      let r2 = row;
      let c2 = col;
      const cellRect = cell.getBoundingClientRect();
      const edgeRect = edgeParent.getBoundingClientRect();
      const edgeCenterX = edgeRect.left + edgeRect.width / 2;
      const edgeCenterY = edgeRect.top + edgeRect.height / 2;

      if (
        Math.abs(edgeCenterX - cellRect.right) <
        Math.abs(edgeCenterY - cellRect.bottom)
      ) {
        c2 = col + 1;
      } else {
        r2 = row + 1;
      }

      if (r2 < size && c2 < size && (r2 !== row || c2 !== col)) {
        constraints.push({ r1: row, c1: col, r2, c2, type });
      }
    }
  }

  return { size, grid: boardGrid, constraints };
}
