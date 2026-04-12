import { describe, it, expect } from "vitest";
import { solvePatches } from "../../src/solvers/patches";
import type { PatchesBoard, PatchesRect } from "../../src/types";

/** Helper: verify all cells covered, no overlaps, correct areas and shapes */
function validateSolution(
  board: PatchesBoard,
  rects: PatchesRect[],
  grid: number[][]
): void {
  const { size, clues } = board;

  // Every cell assigned
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      expect(grid[r]![c]).toBeGreaterThanOrEqual(0);
    }
  }

  // Each rect matches its clue
  for (let i = 0; i < clues.length; i++) {
    const clue = clues[i]!;
    const rect = rects[i]!;

    // Area matches
    expect(rect.height * rect.width).toBe(clue.area);

    // Contains clue cell
    expect(clue.row).toBeGreaterThanOrEqual(rect.top);
    expect(clue.row).toBeLessThan(rect.top + rect.height);
    expect(clue.col).toBeGreaterThanOrEqual(rect.left);
    expect(clue.col).toBeLessThan(rect.left + rect.width);

    // Shape constraint
    if (clue.shape === "square") expect(rect.height).toBe(rect.width);
    if (clue.shape === "tall") expect(rect.height).toBeGreaterThan(rect.width);
    if (clue.shape === "wide") expect(rect.width).toBeGreaterThan(rect.height);

    // Grid cells match
    for (let r = rect.top; r < rect.top + rect.height; r++) {
      for (let c = rect.left; c < rect.left + rect.width; c++) {
        expect(grid[r]![c]).toBe(i);
      }
    }
  }
}

describe("solvePatches", () => {
  it("solves a simple 4x4 board", () => {
    const board: PatchesBoard = {
      size: 4,
      clues: [
        { row: 0, col: 0, area: 4, shape: "square" },
        { row: 0, col: 2, area: 4, shape: "square" },
        { row: 2, col: 0, area: 8, shape: "wide" },
      ],
    };

    const result = solvePatches(board);
    expect(result.solved).toBe(true);
    validateSolution(board, result.rects, result.grid);
  });

  it("solves a 4x4 with tall and wide rectangles", () => {
    const board: PatchesBoard = {
      size: 4,
      clues: [
        { row: 0, col: 0, area: 8, shape: "tall" },
        { row: 0, col: 2, area: 8, shape: "tall" },
      ],
    };

    const result = solvePatches(board);
    expect(result.solved).toBe(true);
    validateSolution(board, result.rects, result.grid);
  });

  it("solves the real 8x8 LinkedIn board (2026-04-12)", () => {
    const board: PatchesBoard = {
      size: 8,
      clues: [
        { row: 0, col: 6, area: 18, shape: "wide" },   // cell 6
        { row: 1, col: 0, area: 14, shape: "tall" },    // cell 8
        { row: 3, col: 2, area: 4, shape: "tall" },     // cell 26
        { row: 3, col: 4, area: 4, shape: "wide" },     // cell 28
        { row: 4, col: 3, area: 3, shape: "any" },      // cell 35
        { row: 4, col: 5, area: 9, shape: "any" },      // cell 37
        { row: 6, col: 7, area: 4, shape: "any" },      // cell 55
        { row: 7, col: 1, area: 8, shape: "any" },      // cell 57
      ],
    };

    // Total area: 18+14+4+4+3+9+4+8 = 64 = 8*8
    const result = solvePatches(board);
    expect(result.solved).toBe(true);
    expect(result.rects).toHaveLength(8);
    validateSolution(board, result.rects, result.grid);
  });

  it("returns solved=false for impossible board", () => {
    const board: PatchesBoard = {
      size: 4,
      clues: [
        { row: 0, col: 0, area: 9, shape: "square" }, // 3x3 square can't fit two of them in 4x4
        { row: 0, col: 3, area: 9, shape: "square" },
      ],
    };

    const result = solvePatches(board);
    expect(result.solved).toBe(false);
  });
});
