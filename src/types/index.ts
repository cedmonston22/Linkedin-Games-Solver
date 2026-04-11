// ---- Shared types for all games ----

/** Messages sent from popup to content script */
export interface SolveMessage {
  type: "SOLVE";
  game: string;
}

/** Messages sent from content script to background (debugger click) */
export interface ClickCellMessage {
  type: "CLICK_CELL";
  x: number;
  y: number;
}

/** Response from background after a debugger click */
export interface ClickCellResponse {
  success: boolean;
  error?: string;
}

/** Response from content script after solving */
export interface SolveResponse {
  success: boolean;
  error?: string;
}

/** Union of all messages sent via chrome.runtime */
export type Message = SolveMessage | ClickCellMessage;

/** Queens game types */
export interface QueensBoard {
  /** Grid size (e.g. 5 means 5x5) */
  size: number;
  /**
   * 2D array where each number represents a color region.
   * regions[row][col] = regionId
   */
  regions: number[][];
}

export interface QueensSolution {
  /** Array of queen positions -- one per row */
  queens: Position[];
  /** Whether a valid solution was found */
  solved: boolean;
}

export interface Position {
  row: number;
  col: number;
}

/** Display mode for showing the solution */
export type SolveMode = "instant" | "animated";
