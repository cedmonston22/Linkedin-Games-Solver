import type { ZipBoard, Position } from "../../types";
import { encodeWall } from "../../solvers/zip";

type Direction = "right" | "left" | "top" | "bottom";

function detectGameCells(grid: HTMLElement): HTMLElement[] {
  const all = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  const cells: HTMLElement[] = [];
  for (const c of all) {
    if (/^cell-\d+$/.test(c.getAttribute("data-testid") ?? "")) cells.push(c);
  }
  return cells;
}

function classifyWall(
  div: HTMLElement,
  cellRect: DOMRect
): Direction | null {
  const cls = (div.className || "").toString();
  // Unobfuscated class: trail-cell-wall--right, wall--left, etc.
  if (/wall.*?right/i.test(cls)) return "right";
  if (/wall.*?left/i.test(cls)) return "left";
  if (/wall.*?top/i.test(cls)) return "top";
  if (/wall.*?bottom/i.test(cls)) return "bottom";
  // Known obfuscated hashes (kept as a fast-path — may become stale)
  if (cls.includes("_63fae645")) return "right";
  if (cls.includes("_6177935e")) return "left";
  // Geometric fallback: infer from child div's position relative to its cell
  const r = div.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  // A wall is a thin rectangle sitting on one edge of the cell.
  const isThin = r.width < cellRect.width * 0.25 || r.height < cellRect.height * 0.25;
  if (!isThin) return null;
  const midX = r.left + r.width / 2;
  const midY = r.top + r.height / 2;
  const dRight = Math.abs(midX - cellRect.right);
  const dLeft = Math.abs(midX - cellRect.left);
  const dTop = Math.abs(midY - cellRect.top);
  const dBottom = Math.abs(midY - cellRect.bottom);
  const minD = Math.min(dRight, dLeft, dTop, dBottom);
  // Require the edge to be much closer than the opposite edge to count
  if (minD > Math.min(cellRect.width, cellRect.height) * 0.2) return null;
  if (minD === dRight) return "right";
  if (minD === dLeft) return "left";
  if (minD === dTop) return "top";
  return "bottom";
}

export function parseZipBoard(): ZipBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );
  if (!grid) return null;

  const cells = detectGameCells(grid);
  if (cells.length === 0) return null;

  const size = Math.round(Math.sqrt(cells.length));
  if (size * size !== cells.length) return null;

  const checkpoints = new Map<number, Position>();
  const walls = new Set<string>();

  cells.forEach((cell) => {
    const testId = cell.getAttribute("data-testid") ?? "";
    const idxMatch = testId.match(/cell-(\d+)/);
    if (!idxMatch) return;
    const idx = parseInt(idxMatch[1]!, 10);
    const row = Math.floor(idx / size);
    const col = idx % size;

    const ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      const numMatch = ariaLabel.match(/Number\s+(\d+)/);
      if (numMatch) {
        checkpoints.set(parseInt(numMatch[1]!, 10), { row, col });
      }
    }

    const cellRect = cell.getBoundingClientRect();
    cell.querySelectorAll<HTMLElement>("div").forEach((w) => {
      const dir = classifyWall(w, cellRect);
      if (dir) walls.add(encodeWall(row, col, dir));
    });
  });

  if (checkpoints.size < 2) return null;

  return { size, checkpoints, walls };
}
