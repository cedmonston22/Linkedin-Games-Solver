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

/** Messages sent from content script to background (drag events for Zip) */
export interface MouseEventMessage {
  type: "MOUSE_EVENT";
  eventType: string;
  x: number;
  y: number;
}

/** Union of all messages sent via chrome.runtime */
export type Message = SolveMessage | ClickCellMessage | MouseEventMessage;

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

// ---- Tango game types ----

export type TangoValue = "sun" | "moon";

export interface TangoConstraint {
  /** First cell */
  r1: number;
  c1: number;
  /** Second cell (adjacent) */
  r2: number;
  c2: number;
  /** "same" = must match, "different" = must differ */
  type: "same" | "different";
}

export interface TangoBoard {
  /** Grid size (e.g. 6 means 6x6) */
  size: number;
  /**
   * 2D array of pre-filled values. null = empty.
   * grid[row][col]
   */
  grid: (TangoValue | null)[][];
  /** Constraints between adjacent cells */
  constraints: TangoConstraint[];
}

export interface TangoSolution {
  /** Completed grid with all cells filled */
  grid: TangoValue[][];
  /** Whether a valid solution was found */
  solved: boolean;
}

// ---- Patches game types ----

export type PatchesShape = "square" | "tall" | "wide" | "any";

export interface PatchesClue {
  /** Clue cell position */
  row: number;
  col: number;
  /** Number of cells the region must contain */
  area: number;
  /** Shape constraint for the region */
  shape: PatchesShape;
}

export interface PatchesBoard {
  /** Grid size (e.g. 8 means 8x8) */
  size: number;
  /** Clue definitions */
  clues: PatchesClue[];
}

export interface PatchesRect {
  top: number;
  left: number;
  height: number;
  width: number;
}

export interface PatchesSolution {
  /** For each clue (by index), the rectangle it occupies */
  rects: PatchesRect[];
  /** 2D grid mapping each cell to a clue index */
  grid: number[][];
  /** Whether a valid solution was found */
  solved: boolean;
}

// ---- Zip game types ----

/** A wall between two adjacent cells, blocking path movement */
export interface Wall {
  /** The cell that has this wall */
  row: number;
  col: number;
  /** Which edge of the cell the wall is on */
  direction: "top" | "bottom" | "left" | "right";
}

export interface ZipBoard {
  /** Grid size (e.g. 7 means 7x7) */
  size: number;
  /**
   * Map of checkpoint number to its position.
   * The path must visit these in order: 1 → 2 → 3 → ...
   */
  checkpoints: Map<number, Position>;
  /**
   * Set of walls that block movement between adjacent cells.
   * Encoded as "row,col,direction" strings for fast lookup.
   */
  walls: Set<string>;
}

export interface ZipSolution {
  /** Ordered array of positions representing the complete path */
  path: Position[];
  /** Whether a valid solution was found */
  solved: boolean;
}
