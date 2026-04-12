import { describe, it, expect } from "vitest";
import { solveTango } from "../../src/solvers/tango";
import type { TangoBoard, TangoValue, TangoConstraint } from "../../src/types";

/** Helper: check each row and column has equal sun/moon */
function checkBalance(grid: TangoValue[][], size: number): boolean {
  const half = size / 2;
  for (let r = 0; r < size; r++) {
    const suns = grid[r]!.filter((v) => v === "sun").length;
    if (suns !== half) return false;
  }
  for (let c = 0; c < size; c++) {
    const suns = grid.map((row) => row[c]).filter((v) => v === "sun").length;
    if (suns !== half) return false;
  }
  return true;
}

/** Helper: no three consecutive same in any row or column */
function checkNoTriple(grid: TangoValue[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 2; c++) {
      if (grid[r]![c] === grid[r]![c + 1] && grid[r]![c] === grid[r]![c + 2])
        return false;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 2; r++) {
      if (grid[r]![c] === grid[r + 1]![c] && grid[r]![c] === grid[r + 2]![c])
        return false;
    }
  }
  return true;
}

/** Helper: check all constraints satisfied */
function checkConstraints(
  grid: TangoValue[][],
  constraints: TangoConstraint[]
): boolean {
  for (const c of constraints) {
    const v1 = grid[c.r1]![c.c1];
    const v2 = grid[c.r2]![c.c2];
    if (c.type === "same" && v1 !== v2) return false;
    if (c.type === "different" && v1 === v2) return false;
  }
  return true;
}

/** Helper: check pre-filled cells are preserved */
function checkPreFilled(
  solution: TangoValue[][],
  initial: (TangoValue | null)[][]
): boolean {
  for (let r = 0; r < initial.length; r++) {
    for (let c = 0; c < initial[r]!.length; c++) {
      if (initial[r]![c] !== null && solution[r]![c] !== initial[r]![c])
        return false;
    }
  }
  return true;
}

function validateSolution(board: TangoBoard, grid: TangoValue[][]): void {
  expect(checkBalance(grid, board.size)).toBe(true);
  expect(checkNoTriple(grid, board.size)).toBe(true);
  expect(checkConstraints(grid, board.constraints)).toBe(true);
  expect(checkPreFilled(grid, board.grid)).toBe(true);
}

describe("solveTango", () => {
  it("solves a simple 4x4 board with no constraints", () => {
    const board: TangoBoard = {
      size: 4,
      grid: [
        ["sun", null, null, null],
        [null, null, null, "moon"],
        [null, null, null, null],
        [null, "sun", null, null],
      ],
      constraints: [],
    };

    const result = solveTango(board);
    expect(result.solved).toBe(true);
    expect(result.grid).toHaveLength(4);
    validateSolution(board, result.grid);
  });

  it("solves a 4x4 board with constraints", () => {
    const board: TangoBoard = {
      size: 4,
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      constraints: [
        { r1: 0, c1: 0, r2: 0, c2: 1, type: "same" },
        { r1: 1, c1: 2, r2: 1, c2: 3, type: "different" },
        { r1: 0, c1: 0, r2: 1, c2: 0, type: "different" },
      ],
    };

    const result = solveTango(board);
    expect(result.solved).toBe(true);
    expect(result.grid).toHaveLength(4);
    validateSolution(board, result.grid);
  });

  it("solves the real 6x6 LinkedIn board (2026-04-12)", () => {
    const board: TangoBoard = {
      size: 6,
      grid: [
        ["sun", null, null, null, null, "sun"],
        [null, "sun", null, null, "moon", null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, "moon", null, null, "sun", null],
        ["moon", null, null, null, null, "sun"],
      ],
      constraints: [
        // Row 0: cell(0,2) x cell(0,3)
        { r1: 0, c1: 2, r2: 0, c2: 3, type: "different" },
        // Row 1: cell(1,2) x cell(1,3)
        { r1: 1, c1: 2, r2: 1, c2: 3, type: "different" },
        // Row 2→3 vertical constraints
        { r1: 2, c1: 0, r2: 3, c2: 0, type: "same" },
        { r1: 2, c1: 1, r2: 3, c2: 1, type: "different" },
        { r1: 2, c1: 2, r2: 3, c2: 2, type: "same" },
        { r1: 2, c1: 3, r2: 3, c2: 3, type: "different" },
        { r1: 2, c1: 4, r2: 3, c2: 4, type: "different" },
        { r1: 2, c1: 5, r2: 3, c2: 5, type: "different" },
        // Row 4: cell(4,2) x cell(4,3)
        { r1: 4, c1: 2, r2: 4, c2: 3, type: "different" },
        // Row 5: cell(5,2) = cell(5,3)
        { r1: 5, c1: 2, r2: 5, c2: 3, type: "same" },
      ],
    };

    const result = solveTango(board);
    expect(result.solved).toBe(true);
    expect(result.grid).toHaveLength(6);
    validateSolution(board, result.grid);
  });

  it("returns solved=false for impossible board", () => {
    // Row 0 has 3 suns locked — impossible (needs 2 sun, 2 moon for 4x4)
    const board: TangoBoard = {
      size: 4,
      grid: [
        ["sun", "sun", "sun", null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      constraints: [],
    };

    const result = solveTango(board);
    expect(result.solved).toBe(false);
  });
});
