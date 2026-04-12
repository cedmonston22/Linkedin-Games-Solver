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
import { parseTangoBoard } from "./tango/parser";
import { solveTango } from "../solvers/tango";
import { injectTangoSolution } from "./tango/injector";

console.log("[LinkedIn Solver] Content script loaded");

async function runQueensSolver(): Promise<SolveResponse | null> {
  const board = parseQueensBoard();
  if (!board) return null;

  const solution = solveQueens(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectQueensSolution(solution, board.size);
  return { success: true };
}

async function runZipSolver(): Promise<SolveResponse | null> {
  const board = parseZipBoard();
  if (!board) return null;

  const solution = solveZip(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectZipSolution(solution, board.size);
  return { success: true };
}

async function runTangoSolver(): Promise<SolveResponse | null> {
  const board = parseTangoBoard();
  if (!board) return null;

  const solution = solveTango(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  await injectTangoSolution(solution, board.size, board.grid);
  return { success: true };
}

async function runSolver(game: string): Promise<SolveResponse | null> {
  switch (game) {
    case "queens":
      return runQueensSolver();
    case "zip":
      return runZipSolver();
    case "tango":
      return runTangoSolver();
    default:
      return null;
  }
}

/** Listen for solve commands from the popup */
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse: (response: SolveResponse) => void) => {
    if (message.type === "SOLVE") {
      runSolver(message.game).then((result) => {
        sendResponse(result ?? { success: false, error: "Failed to parse board" });
      });
      return true;
    }
    return undefined;
  }
);
