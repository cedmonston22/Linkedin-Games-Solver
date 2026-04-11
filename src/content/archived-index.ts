/**
 * Content script for archivedqueens.com.
 * Parses the board, solves locally, and injects the solution
 * using simple mousedown events (no debugger needed).
 */

import type { SolveResponse } from "../types";
import { parseArchivedBoard } from "./archived/parser";
import { solveQueens } from "../solvers/queens";
import { injectArchivedSolution } from "./archived/injector";

console.log("[LinkedIn Solver] Archived Queens content script loaded");

async function runSolver(): Promise<SolveResponse> {
  const board = parseArchivedBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  const solution = solveQueens(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectArchivedSolution(solution, board.size);
  return { success: true };
}

/** Listen for solve commands from the popup */
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse: (response: SolveResponse) => void) => {
    if (message.type === "SOLVE") {
      runSolver().then((result) => {
        sendResponse(result);
      });
      return true; // keep sendResponse alive for async
    }
    return undefined;
  }
);
