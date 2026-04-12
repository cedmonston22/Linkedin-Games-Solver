console.log("[LinkedIn Solver] Content script loaded");

// ==== Queens Parser ====

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

// ==== Queens Solver ====

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

// ==== Queens Injector ====

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

// ==== Zip Parser ====

function encodeWall(row, col, direction) {
  return row + "," + col + "," + direction;
}

function parseZipBoard() {
  var grid = document.querySelector('[data-testid="interactive-grid"]');
  if (!grid) {
    console.error("[LinkedIn Solver] No interactive grid found");
    return null;
  }

  var style = grid.getAttribute("style") || "";
  var sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) {
    console.error("[LinkedIn Solver] Could not determine grid size");
    return null;
  }
  var size = parseInt(sizeMatch[1], 10);

  var cells = grid.querySelectorAll('[data-testid^="cell-"]');
  if (cells.length !== size * size) {
    console.error("[LinkedIn Solver] Expected " + (size * size) + " cells, found " + cells.length);
    return null;
  }

  var checkpoints = {};
  var walls = {};

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i];
    var idxAttr = cell.getAttribute("data-cell-idx");
    if (idxAttr === null) continue;
    var idx = parseInt(idxAttr, 10);
    var row = Math.floor(idx / size);
    var col = idx % size;

    // Check for numbered checkpoint
    var ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      var numMatch = ariaLabel.match(/Number\s+(\d+)/);
      if (numMatch) {
        checkpoints[parseInt(numMatch[1], 10)] = { row: row, col: col };
      }
    }

    // Check for walls
    var divs = cell.querySelectorAll("div");
    for (var d = 0; d < divs.length; d++) {
      var cls = divs[d].className;
      if (cls.indexOf("trail-cell-wall--right") !== -1 || cls.indexOf("_63fae645") !== -1) {
        walls[encodeWall(row, col, "right")] = true;
      }
      if (cls.indexOf("trail-cell-wall--left") !== -1 || cls.indexOf("_6177935e") !== -1) {
        walls[encodeWall(row, col, "left")] = true;
      }
      if (cls.indexOf("trail-cell-wall--top") !== -1) {
        walls[encodeWall(row, col, "top")] = true;
      }
      if (cls.indexOf("trail-cell-wall--bottom") !== -1) {
        walls[encodeWall(row, col, "bottom")] = true;
      }
    }
  }

  console.log("[LinkedIn Solver] Parsed " + size + "x" + size + " Zip board");
  return { size: size, checkpoints: checkpoints, walls: walls };
}

// ==== Zip Solver ====

function solveZip(board) {
  var size = board.size;
  var checkpoints = board.checkpoints;
  var walls = board.walls;
  var totalCells = size * size;

  // Build checkpoint lookup
  var checkpointAt = {};
  var maxCheckpoint = 0;
  for (var num in checkpoints) {
    var n = parseInt(num, 10);
    var pos = checkpoints[num];
    checkpointAt[pos.row + "," + pos.col] = n;
    if (n > maxCheckpoint) maxCheckpoint = n;
  }

  var visited = [];
  for (var r = 0; r < size; r++) {
    visited[r] = [];
    for (var c = 0; c < size; c++) {
      visited[r][c] = false;
    }
  }

  var path = [];
  var DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function isBlocked(r1, c1, r2, c2) {
    if (r2 === r1 && c2 === c1 + 1) {
      return walls[encodeWall(r1, c1, "right")] || walls[encodeWall(r2, c2, "left")];
    }
    if (r2 === r1 && c2 === c1 - 1) {
      return walls[encodeWall(r1, c1, "left")] || walls[encodeWall(r2, c2, "right")];
    }
    if (r2 === r1 + 1 && c2 === c1) {
      return walls[encodeWall(r1, c1, "bottom")] || walls[encodeWall(r2, c2, "top")];
    }
    if (r2 === r1 - 1 && c2 === c1) {
      return walls[encodeWall(r1, c1, "top")] || walls[encodeWall(r2, c2, "bottom")];
    }
    return true;
  }

  function solve(row, col, nextCheckpoint) {
    if (row < 0 || row >= size || col < 0 || col >= size) return false;
    if (visited[row][col]) return false;

    var cpNum = checkpointAt[row + "," + col];
    if (cpNum !== undefined) {
      if (cpNum !== nextCheckpoint) return false;
    }

    visited[row][col] = true;
    path.push({ row: row, col: col });

    var newNext = (cpNum === nextCheckpoint) ? nextCheckpoint + 1 : nextCheckpoint;

    if (path.length === totalCells) {
      if (newNext > maxCheckpoint) return true;
      visited[row][col] = false;
      path.pop();
      return false;
    }

    for (var d = 0; d < DIRS.length; d++) {
      var nr = row + DIRS[d][0];
      var nc = col + DIRS[d][1];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr][nc]) continue;
      if (isBlocked(row, col, nr, nc)) continue;
      if (solve(nr, nc, newNext)) return true;
    }

    visited[row][col] = false;
    path.pop();
    return false;
  }

  var start = checkpoints[1];
  if (!start) return { path: [], solved: false };

  var solved = solve(start.row, start.col, 1);
  return { path: solved ? path.slice() : [], solved: solved };
}

// ==== Zip Injector ====

function sendMouseEvent(eventType, x, y) {
  return new Promise(function(resolve) {
    chrome.runtime.sendMessage(
      { type: "MOUSE_EVENT", eventType: eventType, x: x, y: y },
      function(response) { resolve(response); }
    );
  });
}

function getCellCenterByIdx(idx) {
  var cell = document.querySelector('[data-testid="cell-' + idx + '"]');
  if (!cell) return null;
  var rect = cell.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2)
  };
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ==== Solver Dispatcher ====

async function runQueensSolver() {
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

async function runZipSolver() {
  var board = parseZipBoard();
  if (!board) return { success: false, error: "Failed to parse board" };

  var solution = solveZip(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  // Simulate drag: mousedown, mousemove through path, mouseup
  var first = solution.path[0];
  var firstIdx = first.row * board.size + first.col;
  var startCenter = getCellCenterByIdx(firstIdx);
  if (!startCenter) return { success: false, error: "Could not find start cell" };

  await sendMouseEvent("mousePressed", startCenter.x, startCenter.y);
  await delay(50);

  for (var i = 1; i < solution.path.length; i++) {
    var pos = solution.path[i];
    var idx = pos.row * board.size + pos.col;
    var center = getCellCenterByIdx(idx);
    if (center) {
      await sendMouseEvent("mouseMoved", center.x, center.y);
      await delay(30);
    }
  }

  var last = solution.path[solution.path.length - 1];
  var lastIdx = last.row * board.size + last.col;
  var endCenter = getCellCenterByIdx(lastIdx);
  if (endCenter) {
    await sendMouseEvent("mouseReleased", endCenter.x, endCenter.y);
  }

  return { success: true };
}

async function runSolver(game) {
  switch (game) {
    case "queens": return runQueensSolver();
    case "zip": return runZipSolver();
    default: return { success: false, error: "Unknown game: " + game };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "SOLVE") {
    runSolver(message.game).then(function(result) {
      sendResponse(result);
    });
    return true;
  }
});
