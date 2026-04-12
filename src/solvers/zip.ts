import type { ZipBoard, ZipSolution, Position } from "../types";

/**
 * Encodes a wall for set lookup.
 * A wall on the right edge of (r,c) is the same as a wall on the left edge of (r,c+1).
 * We always store the canonical form: the wall between two cells as seen from the cell
 * with the smaller index.
 */
export function encodeWall(row: number, col: number, direction: string): string {
  return `${row},${col},${direction}`;
}

/**
 * Checks if movement from (r1,c1) to (r2,c2) is blocked by a wall.
 */
function isBlocked(walls: Set<string>, r1: number, c1: number, r2: number, c2: number): boolean {
  if (r2 === r1 && c2 === c1 + 1) {
    // Moving right: check right wall of (r1,c1) or left wall of (r2,c2)
    return walls.has(encodeWall(r1, c1, "right")) || walls.has(encodeWall(r2, c2, "left"));
  }
  if (r2 === r1 && c2 === c1 - 1) {
    // Moving left
    return walls.has(encodeWall(r1, c1, "left")) || walls.has(encodeWall(r2, c2, "right"));
  }
  if (r2 === r1 + 1 && c2 === c1) {
    // Moving down
    return walls.has(encodeWall(r1, c1, "bottom")) || walls.has(encodeWall(r2, c2, "top"));
  }
  if (r2 === r1 - 1 && c2 === c1) {
    // Moving up
    return walls.has(encodeWall(r1, c1, "top")) || walls.has(encodeWall(r2, c2, "bottom"));
  }
  return true; // non-adjacent = blocked
}

// Orthogonal directions: [dRow, dCol]
const DIRS: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

/**
 * Solves the Zip puzzle using backtracking.
 *
 * Rules:
 * - Find a path that visits every cell exactly once
 * - Movement is orthogonal only (up/down/left/right)
 * - Numbered checkpoints must be visited in order (1, 2, 3, ...)
 * - Walls block movement between certain adjacent cells
 */
export function solveZip(board: ZipBoard): ZipSolution {
  const { size, checkpoints, walls } = board;
  const totalCells = size * size;

  // Build a quick lookup: position → checkpoint number (if any)
  const checkpointAt = new Map<string, number>();
  for (const [num, pos] of checkpoints) {
    checkpointAt.set(`${pos.row},${pos.col}`, num);
  }

  const maxCheckpoint = checkpoints.size;

  // Visited grid
  const visited: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );

  const path: Position[] = [];

  function solve(row: number, col: number, nextCheckpoint: number): boolean {
    // Out of bounds or already visited
    if (row < 0 || row >= size || col < 0 || col >= size) return false;
    if (visited[row]![col]!) return false;

    // Check checkpoint constraints
    const cpNum = checkpointAt.get(`${row},${col}`);
    if (cpNum !== undefined) {
      // This cell is a checkpoint — it must be the next one we need
      if (cpNum !== nextCheckpoint) return false;
    }

    // Place on path
    visited[row]![col] = true;
    path.push({ row, col });

    const newNextCheckpoint = cpNum === nextCheckpoint ? nextCheckpoint + 1 : nextCheckpoint;

    // If we've filled all cells, check that all checkpoints were hit
    if (path.length === totalCells) {
      if (newNextCheckpoint > maxCheckpoint) {
        return true;
      }
      // Not all checkpoints visited
      visited[row]![col] = false;
      path.pop();
      return false;
    }

    // Try all four directions
    for (const [dr, dc] of DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr]![nc]!) continue;
      if (isBlocked(walls, row, col, nr, nc)) continue;

      if (solve(nr, nc, newNextCheckpoint)) return true;
    }

    // Backtrack
    visited[row]![col] = false;
    path.pop();
    return false;
  }

  // Start from checkpoint 1
  const start = checkpoints.get(1);
  if (!start) {
    return { path: [], solved: false };
  }

  const solved = solve(start.row, start.col, 1);

  return {
    path: solved ? [...path] : [],
    solved,
  };
}
