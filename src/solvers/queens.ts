import type { QueensBoard, QueensSolution, Position } from "../types";

/**
 * Solves the Queens puzzle using backtracking.
 *
 * Rules:
 * - Exactly one queen per row, per column, and per color region
 * - No two queens can be adjacent (including diagonals)
 */
export function solveQueens(board: QueensBoard): QueensSolution {
  const { size, regions } = board;
  const queens: Position[] = [];

  // Track which columns and regions already have a queen
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isAdjacent(a: Position, b: Position): boolean {
    return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
  }

  function canPlace(row: number, col: number): boolean {
    const region = regions[row]?.[col];
    if (region === undefined) return false;

    // Check column and region constraints
    if (usedCols.has(col)) return false;
    if (usedRegions.has(region)) return false;

    // Check adjacency with all placed queens
    for (const queen of queens) {
      if (isAdjacent(queen, { row, col })) return false;
    }

    return true;
  }

  function solve(row: number): boolean {
    if (row === size) {
      return queens.length === size;
    }

    for (let col = 0; col < size; col++) {
      if (canPlace(row, col)) {
        const region = regions[row]![col]!;
        queens.push({ row, col });
        usedCols.add(col);
        usedRegions.add(region);

        if (solve(row + 1)) return true;

        // Backtrack
        queens.pop();
        usedCols.delete(col);
        usedRegions.delete(region);
      }
    }

    return false;
  }

  const solved = solve(0);

  return {
    queens: solved ? [...queens] : [],
    solved,
  };
}
