import type { TangoBoard, TangoSolution, TangoValue } from "../types";

const VALUES: TangoValue[] = ["sun", "moon"];

/**
 * Solves the Tango puzzle using backtracking.
 *
 * Rules:
 * - Fill every cell with Sun or Moon
 * - Each row and column has equal numbers of Sun and Moon (size/2 each)
 * - No three consecutive same symbols in any row or column
 * - Edge constraints: "same" = adjacent pair must match, "different" = must differ
 */
export function solveTango(board: TangoBoard): TangoSolution {
  const { size, grid: initial, constraints } = board;
  const half = size / 2;

  // Deep copy the grid
  const grid: (TangoValue | null)[][] = initial.map((row) => [...row]);

  // Pre-compute constraint lookups: key = "r,c" → array of {r2,c2,type}
  const constraintMap = new Map<string, { r2: number; c2: number; type: "same" | "different" }[]>();
  for (const c of constraints) {
    const k1 = `${c.r1},${c.c1}`;
    const k2 = `${c.r2},${c.c2}`;
    if (!constraintMap.has(k1)) constraintMap.set(k1, []);
    if (!constraintMap.has(k2)) constraintMap.set(k2, []);
    constraintMap.get(k1)!.push({ r2: c.r2, c2: c.c2, type: c.type });
    constraintMap.get(k2)!.push({ r2: c.r1, c2: c.c1, type: c.type });
  }

  // Count current suns/moons per row and column
  const rowCount = { sun: new Array<number>(size).fill(0), moon: new Array<number>(size).fill(0) };
  const colCount = { sun: new Array<number>(size).fill(0), moon: new Array<number>(size).fill(0) };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r]![c];
      if (v) {
        rowCount[v]![r]!++;
        colCount[v]![c]!++;
      }
    }
  }

  function checkThreeInRow(row: number, col: number, val: TangoValue): boolean {
    // Check horizontal: no 3 consecutive
    // Check left
    if (col >= 2 && grid[row]![col - 1] === val && grid[row]![col - 2] === val) return false;
    // Check middle
    if (col >= 1 && col < size - 1 && grid[row]![col - 1] === val && grid[row]![col + 1] === val) return false;
    // Check right
    if (col < size - 2 && grid[row]![col + 1] === val && grid[row]![col + 2] === val) return false;

    // Check vertical: no 3 consecutive
    if (row >= 2 && grid[row - 1]![col] === val && grid[row - 2]![col] === val) return false;
    if (row >= 1 && row < size - 1 && grid[row - 1]![col] === val && grid[row + 1]![col] === val) return false;
    if (row < size - 2 && grid[row + 1]![col] === val && grid[row + 2]![col] === val) return false;

    return true;
  }

  function checkConstraints(row: number, col: number, val: TangoValue): boolean {
    const key = `${row},${col}`;
    const related = constraintMap.get(key);
    if (!related) return true;

    for (const { r2, c2, type } of related) {
      const other = grid[r2]![c2];
      if (other === null) continue; // other cell not filled yet
      if (type === "same" && other !== val) return false;
      if (type === "different" && other === val) return false;
    }
    return true;
  }

  function canPlace(row: number, col: number, val: TangoValue): boolean {
    // Row/column count limits
    if (rowCount[val]![row]! >= half) return false;
    if (colCount[val]![col]! >= half) return false;

    // No three consecutive
    if (!checkThreeInRow(row, col, val)) return false;

    // Edge constraints
    if (!checkConstraints(row, col, val)) return false;

    return true;
  }

  // Collect empty cells
  const emptyCells: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r]![c] === null) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  function solve(idx: number): boolean {
    if (idx === emptyCells.length) return true;

    const { row, col } = emptyCells[idx]!;

    for (const val of VALUES) {
      if (canPlace(row, col, val)) {
        grid[row]![col] = val;
        rowCount[val]![row]!++;
        colCount[val]![col]!++;

        if (solve(idx + 1)) return true;

        // Backtrack
        grid[row]![col] = null;
        rowCount[val]![row]!--;
        colCount[val]![col]!--;
      }
    }

    return false;
  }

  const solved = solve(0);

  return {
    grid: solved ? (grid as TangoValue[][]) : [],
    solved,
  };
}
