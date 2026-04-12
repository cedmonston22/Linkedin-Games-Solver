import type { PatchesBoard, PatchesSolution, PatchesRect, PatchesShape } from "../types";

/**
 * Get all factor pairs (h, w) where h * w = area,
 * filtered by shape constraint.
 */
function getFactorPairs(area: number, shape: PatchesShape): [number, number][] {
  const pairs: [number, number][] = [];
  for (let h = 1; h <= area; h++) {
    if (area % h !== 0) continue;
    const w = area / h;
    switch (shape) {
      case "square":
        if (h === w) pairs.push([h, w]);
        break;
      case "tall":
        if (h > w) pairs.push([h, w]);
        break;
      case "wide":
        if (w > h) pairs.push([h, w]);
        break;
      case "any":
        pairs.push([h, w]);
        break;
    }
  }
  return pairs;
}

/**
 * Solves the Patches puzzle using backtracking.
 *
 * Rules:
 * - Partition the grid into rectangles
 * - Each clue cell must be inside its region
 * - Each region must have the specified area and shape
 * - All cells must be covered
 */
export function solvePatches(board: PatchesBoard): PatchesSolution {
  const { size, clues } = board;

  // Grid: -1 = unassigned, N = assigned to clue index N
  const grid: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(-1)
  );
  const rects: (PatchesRect | null)[] = new Array(clues.length).fill(null);

  // Sort clues by most constrained first (fewest possible placements)
  const clueOrder = clues
    .map((clue, idx) => {
      const pairs = getFactorPairs(clue.area, clue.shape);
      let count = 0;
      for (const [h, w] of pairs) {
        // Count valid positions
        const minTop = Math.max(0, clue.row - h + 1);
        const maxTop = Math.min(size - h, clue.row);
        const minLeft = Math.max(0, clue.col - w + 1);
        const maxLeft = Math.min(size - w, clue.col);
        count += Math.max(0, maxTop - minTop + 1) * Math.max(0, maxLeft - minLeft + 1);
      }
      return { idx, count };
    })
    .sort((a, b) => a.count - b.count)
    .map((x) => x.idx);

  function canPlace(top: number, left: number, h: number, w: number): boolean {
    if (top + h > size || left + w > size) return false;
    for (let r = top; r < top + h; r++) {
      for (let c = left; c < left + w; c++) {
        if (grid[r]![c] !== -1) return false;
      }
    }
    return true;
  }

  function place(top: number, left: number, h: number, w: number, clueIdx: number): void {
    for (let r = top; r < top + h; r++) {
      for (let c = left; c < left + w; c++) {
        grid[r]![c] = clueIdx;
      }
    }
    rects[clueIdx] = { top, left, height: h, width: w };
  }

  function remove(top: number, left: number, h: number, w: number, clueIdx: number): void {
    for (let r = top; r < top + h; r++) {
      for (let c = left; c < left + w; c++) {
        grid[r]![c] = -1;
      }
    }
    rects[clueIdx] = null;
  }

  function solve(orderIdx: number): boolean {
    if (orderIdx === clueOrder.length) {
      // Check all cells covered
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r]![c] === -1) return false;
        }
      }
      return true;
    }

    const clueIdx = clueOrder[orderIdx]!;
    const clue = clues[clueIdx]!;
    const pairs = getFactorPairs(clue.area, clue.shape);

    for (const [h, w] of pairs) {
      // All valid top-left positions that include the clue cell
      const minTop = Math.max(0, clue.row - h + 1);
      const maxTop = Math.min(size - h, clue.row);
      const minLeft = Math.max(0, clue.col - w + 1);
      const maxLeft = Math.min(size - w, clue.col);

      for (let top = minTop; top <= maxTop; top++) {
        for (let left = minLeft; left <= maxLeft; left++) {
          if (canPlace(top, left, h, w)) {
            place(top, left, h, w, clueIdx);
            if (solve(orderIdx + 1)) return true;
            remove(top, left, h, w, clueIdx);
          }
        }
      }
    }

    return false;
  }

  const solved = solve(0);

  return {
    rects: solved ? (rects as PatchesRect[]) : [],
    grid: solved ? grid.map((row) => [...row]) : [],
    solved,
  };
}
