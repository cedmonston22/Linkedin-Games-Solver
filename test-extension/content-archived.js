console.log("[LinkedIn Solver] Archived Queens content script loaded");

// ---- Parser ----
// archivedqueens.com uses a CSS grid of plain divs with inline background-color.
// Grid size is read from grid-template-columns: repeat(N, 1fr).
// Regions are determined by matching background-color values.

function parseArchivedBoard() {
  var board = document.querySelector(".board");
  if (!board) return null;

  // Get grid size from computed style
  var cols = board.style.gridTemplateColumns;
  // Format: "repeat(7, 1fr)" — extract the number
  var sizeMatch = cols.match(/repeat\((\d+)/);
  if (!sizeMatch) return null;
  var size = parseInt(sizeMatch[1], 10);

  var cells = board.children;
  if (cells.length !== size * size) return null;

  var colorToRegion = {};
  var nextRegionId = 0;
  var regions = [];

  for (var r = 0; r < size; r++) {
    regions[r] = [];
    for (var c = 0; c < size; c++) {
      var cell = cells[r * size + c];
      var bg = cell.style.backgroundColor;
      if (colorToRegion[bg] === undefined) {
        colorToRegion[bg] = nextRegionId++;
      }
      regions[r][c] = colorToRegion[bg];
    }
  }

  return { size: size, regions: regions };
}

// ---- Solver (same algorithm) ----

function solveQueens(board) {
  var size = board.size;
  var regions = board.regions;
  var queens = [];
  var usedCols = {};
  var usedRegions = {};

  function isAdjacent(a, b) {
    return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
  }

  function canPlace(row, col) {
    var region = regions[row][col];
    if (region === -1) return false;
    if (usedCols[col]) return false;
    if (usedRegions[region]) return false;
    for (var i = 0; i < queens.length; i++) {
      if (isAdjacent(queens[i], { row: row, col: col })) return false;
    }
    return true;
  }

  function solve(row) {
    if (row === size) return queens.length === size;
    for (var col = 0; col < size; col++) {
      if (canPlace(row, col)) {
        var region = regions[row][col];
        queens.push({ row: row, col: col });
        usedCols[col] = true;
        usedRegions[region] = true;
        if (solve(row + 1)) return true;
        queens.pop();
        delete usedCols[col];
        delete usedRegions[region];
      }
    }
    return false;
  }

  var solved = solve(0);
  return { queens: solved ? queens.slice() : [], solved: solved };
}

// ---- Injector ----
// Uses mousedown events — this site responds to mousedown, not click.
// First mousedown = x, second mousedown = queen symbol.

function simulateMousedown(element) {
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
}

function getCell(row, col, size) {
  var board = document.querySelector(".board");
  if (!board) return null;
  return board.children[row * size + col] || null;
}

async function runSolver() {
  var board = parseArchivedBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  var solution = solveQueens(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  for (var i = 0; i < solution.queens.length; i++) {
    var q = solution.queens[i];
    var cell = getCell(q.row, q.col, board.size);
    if (cell) {
      // First mousedown: places x
      simulateMousedown(cell);
      await new Promise(function(r) { setTimeout(r, 100); });
      // Second mousedown: places queen
      simulateMousedown(cell);
      await new Promise(function(r) { setTimeout(r, 100); });
    }
  }

  return { success: true };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "SOLVE") {
    runSolver().then(function(result) {
      sendResponse(result);
    });
    return true;
  }
});
