/**
 * Content script for LinkedIn games pages.
 * Parses the board, solves locally, and injects the solution
 * using the Chrome Debugger API (via background worker) for trusted clicks.
 */

import type { SolveResponse } from "../types";
import { parseQueensBoard } from "./queens/parser";
import { solveQueens } from "../solvers/queens";
import { injectQueensSolution } from "./queens/injector";
import { parseZipBoard } from "./zip/parser";
import { solveZip } from "../solvers/zip";
import { injectZipSolution } from "./zip/injector";

console.log("[LinkedIn Solver] Content script loaded");

async function runQueensSolver(): Promise<SolveResponse> {
  const board = parseQueensBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  const solution = solveQueens(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectQueensSolution(solution, board.size);
  return { success: true };
}

async function runZipSolver(): Promise<SolveResponse> {
  const board = parseZipBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  const solution = solveZip(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectZipSolution(solution, board.size);
  return { success: true };
}

async function runSolver(game: string): Promise<SolveResponse> {
  switch (game) {
    case "queens":
      return runQueensSolver();
    case "zip":
      return runZipSolver();
    default:
      return { success: false, error: `Unknown game: ${game}` };
  }
}

/** Listen for solve commands from the popup */
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse: (response: SolveResponse) => void) => {
    if (message.type === "SOLVE") {
      runSolver(message.game).then((result) => {
        sendResponse(result);
      });
      return true; // keep sendResponse alive for async
    }
    return undefined;
  }
);
