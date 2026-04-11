import { describe, it, expect } from "vitest";
import { solveQueens } from "../../src/solvers/queens";
import type { QueensBoard, Position } from "../../src/types";

/** Helper: check no two queens are adjacent (including diagonals) */
function noAdjacent(queens: Position[]): boolean {
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i]!;
      const b = queens[j]!;
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        return false;
      }
    }
  }
  return true;
}

/** Helper: validate a solution meets all Queens rules */
function validateSolution(board: QueensBoard, queens: Position[]): void {
  const { size, regions } = board;

  // One queen per row
  const rows = new Set(queens.map((q) => q.row));
  expect(rows.size).toBe(size);

  // One queen per column
  const cols = new Set(queens.map((q) => q.col));
  expect(cols.size).toBe(size);

  // One queen per region
  const usedRegions = new Set(queens.map((q) => regions[q.row]![q.col]!));
  expect(usedRegions.size).toBe(size);

  // No adjacency
  expect(noAdjacent(queens)).toBe(true);
}

describe("solveQueens", () => {
  it("solves a 5x5 board", () => {
    const board: QueensBoard = {
      size: 5,
      regions: [
        [0, 0, 1, 1, 2],
        [0, 0, 1, 2, 2],
        [0, 3, 3, 3, 2],
        [4, 4, 3, 3, 2],
        [4, 4, 4, 3, 3],
      ],
    };

    const result = solveQueens(board);
    expect(result.solved).toBe(true);
    expect(result.queens).toHaveLength(5);
    validateSolution(board, result.queens);
  });

  it("solves a 6x6 board", () => {
    const board: QueensBoard = {
      size: 6,
      regions: [
        [0, 0, 1, 1, 1, 2],
        [0, 0, 0, 1, 2, 2],
        [3, 0, 0, 4, 2, 2],
        [3, 3, 4, 4, 4, 5],
        [3, 3, 3, 4, 5, 5],
        [3, 3, 3, 5, 5, 5],
      ],
    };

    const result = solveQueens(board);
    expect(result.solved).toBe(true);
    expect(result.queens).toHaveLength(6);
    validateSolution(board, result.queens);
  });

  it("returns solved=false for an impossible board", () => {
    // All same region — can only place one queen, but need 3
    const board: QueensBoard = {
      size: 3,
      regions: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    };

    const result = solveQueens(board);
    expect(result.solved).toBe(false);
    expect(result.queens).toHaveLength(0);
  });
});
