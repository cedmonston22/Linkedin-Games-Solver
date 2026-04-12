import { describe, it, expect } from "vitest";
import { solveZip, encodeWall } from "../../src/solvers/zip";
import type { ZipBoard, Position } from "../../src/types";

/** Helper: check that the path visits every cell exactly once */
function coversAllCells(path: Position[], size: number): boolean {
  const visited = new Set<string>();
  for (const p of path) {
    visited.add(`${p.row},${p.col}`);
  }
  return visited.size === size * size;
}

/** Helper: check all moves are orthogonally adjacent */
function allMovesAdjacent(path: Position[]): boolean {
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]!;
    const curr = path[i]!;
    const dist = Math.abs(prev.row - curr.row) + Math.abs(prev.col - curr.col);
    if (dist !== 1) return false;
  }
  return true;
}

/** Helper: check checkpoints are visited in order */
function checkpointsInOrder(
  path: Position[],
  checkpoints: Map<number, Position>
): boolean {
  const cpNums = [...checkpoints.keys()].sort((a, b) => a - b);
  let cpIdx = 0;
  for (const pos of path) {
    const expected = cpNums[cpIdx];
    if (expected === undefined) break;
    const cpPos = checkpoints.get(expected)!;
    if (pos.row === cpPos.row && pos.col === cpPos.col) {
      cpIdx++;
    }
  }
  return cpIdx === cpNums.length;
}

/** Helper: check no move crosses a wall */
function noWallCrossings(path: Position[], walls: Set<string>): boolean {
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]!;
    const curr = path[i]!;

    // Check if movement crosses a wall
    if (curr.col === prev.col + 1) {
      if (
        walls.has(encodeWall(prev.row, prev.col, "right")) ||
        walls.has(encodeWall(curr.row, curr.col, "left"))
      )
        return false;
    }
    if (curr.col === prev.col - 1) {
      if (
        walls.has(encodeWall(prev.row, prev.col, "left")) ||
        walls.has(encodeWall(curr.row, curr.col, "right"))
      )
        return false;
    }
    if (curr.row === prev.row + 1) {
      if (
        walls.has(encodeWall(prev.row, prev.col, "bottom")) ||
        walls.has(encodeWall(curr.row, curr.col, "top"))
      )
        return false;
    }
    if (curr.row === prev.row - 1) {
      if (
        walls.has(encodeWall(prev.row, prev.col, "top")) ||
        walls.has(encodeWall(curr.row, curr.col, "bottom"))
      )
        return false;
    }
  }
  return true;
}

function validateSolution(board: ZipBoard, path: Position[]): void {
  expect(coversAllCells(path, board.size)).toBe(true);
  expect(allMovesAdjacent(path)).toBe(true);
  expect(checkpointsInOrder(path, board.checkpoints)).toBe(true);
  expect(noWallCrossings(path, board.walls)).toBe(true);
  // Path starts at checkpoint 1
  const start = board.checkpoints.get(1)!;
  expect(path[0]).toEqual(start);
}

describe("solveZip", () => {
  it("solves a simple 3x3 board with no walls", () => {
    const board: ZipBoard = {
      size: 3,
      checkpoints: new Map([
        [1, { row: 0, col: 0 }],
        [2, { row: 2, col: 2 }],
      ]),
      walls: new Set(),
    };

    const result = solveZip(board);
    expect(result.solved).toBe(true);
    expect(result.path).toHaveLength(9);
    validateSolution(board, result.path);
  });

  it("solves a 3x3 board with walls", () => {
    // Wall between (0,0) and (0,1) — forces path to go down first
    const board: ZipBoard = {
      size: 3,
      checkpoints: new Map([
        [1, { row: 0, col: 0 }],
        [2, { row: 2, col: 2 }],
      ]),
      walls: new Set([
        encodeWall(0, 0, "right"),
        encodeWall(0, 1, "left"),
      ]),
    };

    const result = solveZip(board);
    expect(result.solved).toBe(true);
    expect(result.path).toHaveLength(9);
    validateSolution(board, result.path);
    // First move must be down (can't go right due to wall)
    expect(result.path[1]).toEqual({ row: 1, col: 0 });
  });

  it("solves a 4x4 board with 3 checkpoints", () => {
    const board: ZipBoard = {
      size: 4,
      checkpoints: new Map([
        [1, { row: 0, col: 0 }],
        [2, { row: 3, col: 3 }],
        [3, { row: 3, col: 0 }],
      ]),
      walls: new Set(),
    };

    const result = solveZip(board);
    expect(result.solved).toBe(true);
    expect(result.path).toHaveLength(16);
    validateSolution(board, result.path);
  });

  it("solves the real 7x7 LinkedIn board (2026-04-12)", () => {
    // Today's board from Playwright inspection
    const board: ZipBoard = {
      size: 7,
      checkpoints: new Map([
        [1, { row: 0, col: 0 }],
        [2, { row: 6, col: 0 }],
        [3, { row: 3, col: 5 }],
        [4, { row: 3, col: 1 }],
        [5, { row: 0, col: 6 }],
        [6, { row: 6, col: 6 }],
      ]),
      walls: new Set([
        // Row 1 walls
        encodeWall(1, 0, "right"),
        encodeWall(1, 1, "left"),
        encodeWall(1, 1, "right"),
        encodeWall(1, 2, "left"),
        encodeWall(1, 4, "right"),
        encodeWall(1, 5, "left"),
        encodeWall(1, 5, "right"),
        encodeWall(1, 6, "left"),
        // Row 2 walls
        encodeWall(2, 2, "right"),
        encodeWall(2, 3, "left"),
        encodeWall(2, 3, "right"),
        encodeWall(2, 4, "left"),
        // Row 4 walls
        encodeWall(4, 2, "right"),
        encodeWall(4, 3, "left"),
        encodeWall(4, 3, "right"),
        encodeWall(4, 4, "left"),
        // Row 5 walls
        encodeWall(5, 0, "right"),
        encodeWall(5, 1, "left"),
        encodeWall(5, 1, "right"),
        encodeWall(5, 2, "left"),
        encodeWall(5, 4, "right"),
        encodeWall(5, 5, "left"),
        encodeWall(5, 5, "right"),
        encodeWall(5, 6, "left"),
      ]),
    };

    const result = solveZip(board);
    expect(result.solved).toBe(true);
    expect(result.path).toHaveLength(49);
    validateSolution(board, result.path);
  });

  it("returns solved=false for impossible board", () => {
    // Completely walled off — cell (0,0) has no exit
    const board: ZipBoard = {
      size: 2,
      checkpoints: new Map([
        [1, { row: 0, col: 0 }],
        [2, { row: 1, col: 1 }],
      ]),
      walls: new Set([
        encodeWall(0, 0, "right"),
        encodeWall(0, 1, "left"),
        encodeWall(0, 0, "bottom"),
        encodeWall(1, 0, "top"),
      ]),
    };

    const result = solveZip(board);
    expect(result.solved).toBe(false);
    expect(result.path).toHaveLength(0);
  });
});
