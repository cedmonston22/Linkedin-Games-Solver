console.log("[LinkedIn Solver] Content script loaded");

// ---- Parser ----

var CELL_LABEL_REGEX = /^(.+?) (?:cell )?of color (.+), row (\d+), column (\d+)$/;

function parseCellLabel(label) {
  var match = CELL_LABEL_REGEX.exec(label);
  if (!match) return null;
  return {
    state: match[1],
    color: match[2],
    row: parseInt(match[3], 10),
    col: parseInt(match[4], 10)
  };
}

function parseQueensBoard() {
  var cells = document.querySelectorAll('[data-testid="interactive-grid"] [data-testid^="cell-"]');
  if (cells.length === 0) return null;

  var parsedCells = [];
  var maxRow = 0;
  var maxCol = 0;

  for (var i = 0; i < cells.length; i++) {
    var label = cells[i].getAttribute("aria-label");
    if (!label) continue;
    var parsed = parseCellLabel(label);
    if (!parsed) continue;
    parsedCells.push(parsed);
    if (parsed.row > maxRow) maxRow = parsed.row;
    if (parsed.col > maxCol) maxCol = parsed.col;
  }

  var size = maxRow;
  var colorToRegion = {};
  var nextRegionId = 0;
  var regions = [];
  for (var r = 0; r < size; r++) {
    regions[r] = [];
    for (var c = 0; c < size; c++) {
      regions[r][c] = -1;
    }
  }

  for (var j = 0; j < parsedCells.length; j++) {
    var cell = parsedCells[j];
    if (colorToRegion[cell.color] === undefined) {
      colorToRegion[cell.color] = nextRegionId++;
    }
    regions[cell.row - 1][cell.col - 1] = colorToRegion[cell.color];
  }

  return { size: size, regions: regions };
}

// ---- Solver ----

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

function sendClick(x, y) {
  return new Promise(function(resolve) {
    chrome.runtime.sendMessage({ type: "CLICK_CELL", x: x, y: y }, function(response) {
      setTimeout(function() { resolve(response); }, 200);
    });
  });
}

function getCellCenter(row, col, size) {
  var idx = row * size + col;
  var cell = document.querySelector('[data-testid="cell-' + idx + '"]');
  if (!cell) return null;
  var rect = cell.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2)
  };
}

async function runSolver() {
  var board = parseQueensBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  var solution = solveQueens(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  for (var i = 0; i < solution.queens.length; i++) {
    var q = solution.queens[i];

    var center1 = getCellCenter(q.row, q.col, board.size);
    if (center1) await sendClick(center1.x, center1.y);

    var center2 = getCellCenter(q.row, q.col, board.size);
    if (center2) await sendClick(center2.x, center2.y);
  }

  return { success: true };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "SOLVE") {
    runSolver().then(function(result) {
      sendResponse(result);
    });
    return true; // keep sendResponse alive for async
  }
});
