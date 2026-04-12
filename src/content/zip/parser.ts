import type { ZipBoard, Position } from "../../types";
import { encodeWall } from "../../solvers/zip";

/**
 * Reads the Zip game board from the LinkedIn DOM.
 *
 * The game is rendered inside the main document (not a nested iframe from
 * the content script's perspective, since the content script runs inside
 * the games iframe). It uses:
 * - `.trail-grid` for the grid container
 * - `.trail-cell[data-cell-idx]` for each cell
 * - `.trail-cell-content` for numbered checkpoints
 * - `.trail-cell-wall--{direction}` for walls between cells
 */
export function parseZipBoard(): ZipBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );

  if (!grid) {
    console.error("[LinkedIn Solver] No interactive grid found");
    return null;
  }

  // Get grid size from CSS variable
  const style = grid.getAttribute("style") ?? "";
  const sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) {
    console.error("[LinkedIn Solver] Could not determine grid size");
    return null;
  }
  const size = parseInt(sizeMatch[1]!, 10);

  const cells = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  if (cells.length !== size * size) {
    console.error(
      `[LinkedIn Solver] Expected ${size * size} cells, found ${cells.length}`
    );
    return null;
  }

  const checkpoints = new Map<number, Position>();
  const walls = new Set<string>();

  cells.forEach((cell) => {
    const idxAttr = cell.getAttribute("data-cell-idx");
    if (idxAttr === null) return;
    const idx = parseInt(idxAttr, 10);
    const row = Math.floor(idx / size);
    const col = idx % size;

    // Check for numbered checkpoint via aria-label
    const ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      const numMatch = ariaLabel.match(/Number\s+(\d+)/);
      if (numMatch) {
        checkpoints.set(parseInt(numMatch[1]!, 10), { row, col });
      }
    }

    // Check for walls — look for child divs with wall classes
    const wallEls = cell.querySelectorAll<HTMLElement>("div");
    wallEls.forEach((w) => {
      const cls = w.className;
      // Handle both obfuscated and unobfuscated class names
      if (cls.includes("trail-cell-wall--right") || cls.includes("_63fae645")) {
        walls.add(encodeWall(row, col, "right"));
      }
      if (cls.includes("trail-cell-wall--left") || cls.includes("_6177935e")) {
        walls.add(encodeWall(row, col, "left"));
      }
      if (cls.includes("trail-cell-wall--top")) {
        walls.add(encodeWall(row, col, "top"));
      }
      if (cls.includes("trail-cell-wall--bottom")) {
        walls.add(encodeWall(row, col, "bottom"));
      }
    });
  });

  if (checkpoints.size < 2) {
    console.error("[LinkedIn Solver] Not enough checkpoints found");
    return null;
  }

  console.log(
    `[LinkedIn Solver] Parsed ${size}x${size} Zip board with ${checkpoints.size} checkpoints and ${walls.size} walls`
  );
  return { size, checkpoints, walls };
}
