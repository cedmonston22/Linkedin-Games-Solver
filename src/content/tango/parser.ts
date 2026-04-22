import type { TangoBoard, TangoValue, TangoConstraint } from "../../types";

export function parseTangoBoard(): TangoBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );
  if (!grid) return null;

  const allCells = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  const cells: HTMLElement[] = [];
  for (const c of allCells) {
    if (/^cell-\d+$/.test(c.getAttribute("data-testid") ?? "")) cells.push(c);
  }
  if (cells.length === 0) return null;

  const size = Math.round(Math.sqrt(cells.length));
  if (size * size !== cells.length) return null;

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

    const svgs = cell.querySelectorAll<SVGElement>("svg[aria-label]");
    for (const svg of svgs) {
      const label = svg.getAttribute("aria-label");
      if (label === "Sun") boardGrid[row]![col] = "sun";
      else if (label === "Moon") boardGrid[row]![col] = "moon";
    }

    const edgeSvgs = cell.querySelectorAll<SVGElement>(
      'svg[aria-label="Equal"], svg[aria-label="Cross"]'
    );
    for (const edgeSvg of edgeSvgs) {
      const edgeLabel = edgeSvg.getAttribute("aria-label")!;
      const type: "same" | "different" =
        edgeLabel === "Equal" ? "same" : "different";

      const edgeParent = edgeSvg.parentElement;
      if (!edgeParent) continue;

      let r2 = row;
      let c2 = col;
      const parentClass = (edgeParent.className || "").toString();
      // Prefer class-name hints when present (unobfuscated builds)
      if (/right/i.test(parentClass)) {
        c2 = col + 1;
      } else if (/down|bottom/i.test(parentClass)) {
        r2 = row + 1;
      } else {
        // Geometric fallback: whichever cell edge the marker sits closer to
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
      }

      if (r2 < size && c2 < size && (r2 !== row || c2 !== col)) {
        constraints.push({ r1: row, c1: col, r2, c2, type });
      }
    }
  }

  return { size, grid: boardGrid, constraints };
}
