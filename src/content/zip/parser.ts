import type { ZipBoard, Position } from "../../types";
import { encodeWall } from "../../solvers/zip";

export function parseZipBoard(): ZipBoard | null {
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

  const checkpoints = new Map<number, Position>();
  const walls = new Set<string>();

  cells.forEach((cell) => {
    const testId = cell.getAttribute("data-testid") ?? "";
    const idxMatch = testId.match(/cell-(\d+)/);
    if (!idxMatch) return;
    const idx = parseInt(idxMatch[1]!, 10);
    const row = Math.floor(idx / size);
    const col = idx % size;

    // Numbered checkpoints via aria-label
    const ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      const numMatch = ariaLabel.match(/Number\s+(\d+)/);
      if (numMatch) {
        checkpoints.set(parseInt(numMatch[1]!, 10), { row, col });
      }
    }

    // Walls via obfuscated class names
    const allDivs = cell.querySelectorAll<HTMLElement>("div");
    allDivs.forEach((w) => {
      const cls = w.className;
      if (cls.includes("_63fae645")) walls.add(encodeWall(row, col, "right"));
      if (cls.includes("_6177935e")) walls.add(encodeWall(row, col, "left"));
    });
  });

  if (checkpoints.size < 2) return null;

  return { size, checkpoints, walls };
}
