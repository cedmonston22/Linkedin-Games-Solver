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

  if (parsedCells.length === 0) return null;

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

// ==== Shared Helpers ====

function sendClick(x, y) {
  return new Promise(function(resolve) {
    chrome.runtime.sendMessage({ type: "CLICK_CELL", x: x, y: y }, function(response) {
      setTimeout(function() { resolve(response); }, 200);
    });
  });
}

function sendMouseEvent(eventType, x, y) {
  return new Promise(function(resolve) {
    chrome.runtime.sendMessage(
      { type: "MOUSE_EVENT", eventType: eventType, x: x, y: y },
      function(response) { resolve(response); }
    );
  });
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
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
  if (!grid) return null;

  var style = grid.getAttribute("style") || "";
  var sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) return null;
  var size = parseInt(sizeMatch[1], 10);

  var cells = grid.querySelectorAll('[data-testid^="cell-"]');
  if (cells.length !== size * size) return null;

  var checkpoints = {};
  var walls = {};

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i];
    var testId = cell.getAttribute("data-testid") || "";
    var idxMatch = testId.match(/cell-(\d+)/);
    if (!idxMatch) continue;
    var idx = parseInt(idxMatch[1], 10);
    var row = Math.floor(idx / size);
    var col = idx % size;

    // Check for numbered checkpoint via aria-label
    var ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      var numMatch = ariaLabel.match(/Number\s+(\d+)/);
      if (numMatch) {
        checkpoints[parseInt(numMatch[1], 10)] = { row: row, col: col };
      }
    }

    // Check for walls — look for child divs with wall classes
    var allDivs = cell.querySelectorAll("div");
    for (var d = 0; d < allDivs.length; d++) {
      var cls = allDivs[d].className;
      // Obfuscated class names from LinkedIn's build
      if (cls.indexOf("_63fae645") !== -1) walls[encodeWall(row, col, "right")] = true;
      if (cls.indexOf("_6177935e") !== -1) walls[encodeWall(row, col, "left")] = true;
    }
  }

  return { size: size, checkpoints: checkpoints, walls: walls };
}

// ==== Zip Solver ====

function solveZip(board) {
  var size = board.size;
  var checkpoints = board.checkpoints;
  var walls = board.walls;
  var totalCells = size * size;

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
    if (r2 === r1 && c2 === c1 + 1) return walls[encodeWall(r1, c1, "right")] || walls[encodeWall(r2, c2, "left")];
    if (r2 === r1 && c2 === c1 - 1) return walls[encodeWall(r1, c1, "left")] || walls[encodeWall(r2, c2, "right")];
    if (r2 === r1 + 1 && c2 === c1) return walls[encodeWall(r1, c1, "bottom")] || walls[encodeWall(r2, c2, "top")];
    if (r2 === r1 - 1 && c2 === c1) return walls[encodeWall(r1, c1, "top")] || walls[encodeWall(r2, c2, "bottom")];
    return true;
  }

  function solve(row, col, nextCheckpoint) {
    if (row < 0 || row >= size || col < 0 || col >= size) return false;
    if (visited[row][col]) return false;

    var cpNum = checkpointAt[row + "," + col];
    if (cpNum !== undefined && cpNum !== nextCheckpoint) return false;

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

// ==== Tango Parser ====

function parseTangoBoard() {
  var grid = document.querySelector('[data-testid="interactive-grid"]');
  if (!grid) return null;

  var style = grid.getAttribute("style") || "";
  var sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) return null;
  var size = parseInt(sizeMatch[1], 10);

  // Filter to only game cells (exclude "How to play" example cells)
  var allCells = grid.querySelectorAll('[data-testid^="cell-"]');
  var cells = [];
  for (var ci = 0; ci < allCells.length; ci++) {
    var tid = allCells[ci].getAttribute("data-testid") || "";
    if (tid.match(/^cell-\d+$/)) cells.push(allCells[ci]);
  }
  if (cells.length !== size * size) return null;

  var board = [];
  for (var r = 0; r < size; r++) {
    board[r] = [];
    for (var c = 0; c < size; c++) {
      board[r][c] = null;
    }
  }

  var constraints = [];

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i];
    var testId = cell.getAttribute("data-testid") || "";
    var idxMatch = testId.match(/cell-(\d+)/);
    if (!idxMatch) continue;
    var idx = parseInt(idxMatch[1], 10);
    var row = Math.floor(idx / size);
    var col = idx % size;

    // Read cell value from SVG aria-label inside the cell
    var svgs = cell.querySelectorAll('svg[aria-label]');
    for (var s = 0; s < svgs.length; s++) {
      var svgLabel = svgs[s].getAttribute("aria-label");
      if (svgLabel === "Sun") board[row][col] = "sun";
      else if (svgLabel === "Moon") board[row][col] = "moon";
    }

    // Read constraint markers — SVGs with aria-label "Equal" or "Cross"
    // These are on edge elements between cells
    var edgeSvgs = cell.querySelectorAll('svg[aria-label="Equal"], svg[aria-label="Cross"]');
    for (var e = 0; e < edgeSvgs.length; e++) {
      var edgeSvg = edgeSvgs[e];
      var edgeLabel = edgeSvg.getAttribute("aria-label");
      var type = (edgeLabel === "Equal") ? "same" : "different";

      // Determine direction by checking the parent edge element's class
      var edgeParent = edgeSvg.parentElement;
      if (!edgeParent) continue;
      var parentClass = edgeParent.className || "";

      var r2 = row, c2 = col;
      // Check for right/down indicators in class names (obfuscated or not)
      // Right edges connect (row, col) to (row, col+1)
      // Down edges connect (row, col) to (row+1, col)
      // We detect direction by the edge element's position/class
      if (parentClass.indexOf("--right") !== -1 || parentClass.indexOf("_63fae645") !== -1) {
        c2 = col + 1;
      } else if (parentClass.indexOf("--down") !== -1 || parentClass.indexOf("_6177935e") !== -1) {
        r2 = row + 1;
      } else {
        // Try to detect from position: get bounding rects
        var cellRect = cell.getBoundingClientRect();
        var edgeRect = edgeParent.getBoundingClientRect();
        var edgeCenterX = edgeRect.left + edgeRect.width / 2;
        var edgeCenterY = edgeRect.top + edgeRect.height / 2;
        if (Math.abs(edgeCenterX - cellRect.right) < Math.abs(edgeCenterY - cellRect.bottom)) {
          c2 = col + 1; // right edge
        } else {
          r2 = row + 1; // bottom edge
        }
      }

      if (r2 < size && c2 < size && (r2 !== row || c2 !== col)) {
        constraints.push({ r1: row, c1: col, r2: r2, c2: c2, type: type });
      }
    }
  }

  return { size: size, grid: board, constraints: constraints };
}

// ==== Tango Solver ====

function solveTango(board) {
  var size = board.size;
  var initial = board.grid;
  var constraints = board.constraints;
  var half = size / 2;
  var VALUES = ['sun', 'moon'];

  var grid = [];
  for (var r = 0; r < size; r++) {
    grid[r] = initial[r].slice();
  }

  var constraintMap = {};
  for (var ci = 0; ci < constraints.length; ci++) {
    var con = constraints[ci];
    var k1 = con.r1 + ',' + con.c1;
    var k2 = con.r2 + ',' + con.c2;
    if (!constraintMap[k1]) constraintMap[k1] = [];
    if (!constraintMap[k2]) constraintMap[k2] = [];
    constraintMap[k1].push({ r2: con.r2, c2: con.c2, type: con.type });
    constraintMap[k2].push({ r2: con.r1, c2: con.c1, type: con.type });
  }

  var rowCount = { sun: [], moon: [] };
  var colCount = { sun: [], moon: [] };
  for (var i = 0; i < size; i++) {
    rowCount.sun[i] = 0; rowCount.moon[i] = 0;
    colCount.sun[i] = 0; colCount.moon[i] = 0;
  }
  for (var r2 = 0; r2 < size; r2++) {
    for (var c2 = 0; c2 < size; c2++) {
      var v = grid[r2][c2];
      if (v) { rowCount[v][r2]++; colCount[v][c2]++; }
    }
  }

  function checkThree(row, col, val) {
    if (col >= 2 && grid[row][col-1] === val && grid[row][col-2] === val) return false;
    if (col >= 1 && col < size-1 && grid[row][col-1] === val && grid[row][col+1] === val) return false;
    if (col < size-2 && grid[row][col+1] === val && grid[row][col+2] === val) return false;
    if (row >= 2 && grid[row-1][col] === val && grid[row-2][col] === val) return false;
    if (row >= 1 && row < size-1 && grid[row-1][col] === val && grid[row+1][col] === val) return false;
    if (row < size-2 && grid[row+1][col] === val && grid[row+2][col] === val) return false;
    return true;
  }

  function checkCons(row, col, val) {
    var key = row + ',' + col;
    var related = constraintMap[key];
    if (!related) return true;
    for (var i = 0; i < related.length; i++) {
      var other = grid[related[i].r2][related[i].c2];
      if (other === null) continue;
      if (related[i].type === 'same' && other !== val) return false;
      if (related[i].type === 'different' && other === val) return false;
    }
    return true;
  }

  function canPlace(row, col, val) {
    if (rowCount[val][row] >= half) return false;
    if (colCount[val][col] >= half) return false;
    if (!checkThree(row, col, val)) return false;
    if (!checkCons(row, col, val)) return false;
    return true;
  }

  var emptyCells = [];
  for (var er = 0; er < size; er++) {
    for (var ec = 0; ec < size; ec++) {
      if (grid[er][ec] === null) emptyCells.push({ row: er, col: ec });
    }
  }

  function solve(idx) {
    if (idx === emptyCells.length) return true;
    var cell = emptyCells[idx];
    for (var vi = 0; vi < VALUES.length; vi++) {
      var val = VALUES[vi];
      if (canPlace(cell.row, cell.col, val)) {
        grid[cell.row][cell.col] = val;
        rowCount[val][cell.row]++;
        colCount[val][cell.col]++;
        if (solve(idx + 1)) return true;
        grid[cell.row][cell.col] = null;
        rowCount[val][cell.row]--;
        colCount[val][cell.col]--;
      }
    }
    return false;
  }

  var solved = solve(0);
  return { grid: solved ? grid : [], solved: solved };
}

// ==== Patches Parser ====

var PATCHES_CLUE_REGEX = /Row (\d+), column (\d+), (.+?) clue, (\d+) cells/;

function parsePatchesShape(shapeText) {
  if (shapeText === "square") return "square";
  if (shapeText === "tall rectangle") return "tall";
  if (shapeText === "wide rectangle") return "wide";
  return "any";
}

function parsePatchesBoard() {
  var grid = document.querySelector('[data-testid="interactive-grid"]');
  if (!grid) return null;

  var style = grid.getAttribute("style") || "";
  var sizeMatch = style.match(/--_6afcf54e:\s*(\d+)/);
  if (!sizeMatch) return null;
  var size = parseInt(sizeMatch[1], 10);

  var allPCells = grid.querySelectorAll('[data-testid^="cell-"]');
  var cells = [];
  for (var pci = 0; pci < allPCells.length; pci++) {
    var ptid = allPCells[pci].getAttribute("data-testid") || "";
    if (ptid.match(/^cell-\d+$/)) cells.push(allPCells[pci]);
  }
  if (cells.length !== size * size) return null;

  var clues = [];
  for (var i = 0; i < cells.length; i++) {
    var ariaLabel = cells[i].getAttribute("aria-label") || "";
    var match = PATCHES_CLUE_REGEX.exec(ariaLabel);
    if (!match) continue;
    clues.push({
      row: parseInt(match[1], 10) - 1,
      col: parseInt(match[2], 10) - 1,
      shape: parsePatchesShape(match[3]),
      area: parseInt(match[4], 10)
    });
  }

  if (clues.length === 0) return null;
  return { size: size, clues: clues };
}

// ==== Patches Solver ====

function getPatchesFactorPairs(area, shape) {
  var pairs = [];
  for (var h = 1; h <= area; h++) {
    if (area % h !== 0) continue;
    var w = area / h;
    if (shape === "square" && h === w) pairs.push([h, w]);
    else if (shape === "tall" && h > w) pairs.push([h, w]);
    else if (shape === "wide" && w > h) pairs.push([h, w]);
    else if (shape === "any") pairs.push([h, w]);
  }
  return pairs;
}

function solvePatches(board) {
  var size = board.size;
  var clues = board.clues;

  var grid = [];
  for (var r = 0; r < size; r++) {
    grid[r] = [];
    for (var c = 0; c < size; c++) {
      grid[r][c] = -1;
    }
  }
  var rects = new Array(clues.length);

  // Sort clues by most constrained first
  var clueOrder = [];
  for (var ci = 0; ci < clues.length; ci++) {
    var clue = clues[ci];
    var pairs = getPatchesFactorPairs(clue.area, clue.shape);
    var count = 0;
    for (var p = 0; p < pairs.length; p++) {
      var ph = pairs[p][0], pw = pairs[p][1];
      var minT = Math.max(0, clue.row - ph + 1);
      var maxT = Math.min(size - ph, clue.row);
      var minL = Math.max(0, clue.col - pw + 1);
      var maxL = Math.min(size - pw, clue.col);
      count += Math.max(0, maxT - minT + 1) * Math.max(0, maxL - minL + 1);
    }
    clueOrder.push({ idx: ci, count: count });
  }
  clueOrder.sort(function(a, b) { return a.count - b.count; });

  function canPlace(top, left, h, w) {
    if (top + h > size || left + w > size) return false;
    for (var r = top; r < top + h; r++) {
      for (var c = left; c < left + w; c++) {
        if (grid[r][c] !== -1) return false;
      }
    }
    return true;
  }

  function place(top, left, h, w, clueIdx) {
    for (var r = top; r < top + h; r++) {
      for (var c = left; c < left + w; c++) {
        grid[r][c] = clueIdx;
      }
    }
    rects[clueIdx] = { top: top, left: left, height: h, width: w };
  }

  function removeRect(top, left, h, w) {
    for (var r = top; r < top + h; r++) {
      for (var c = left; c < left + w; c++) {
        grid[r][c] = -1;
      }
    }
  }

  function solve(orderIdx) {
    if (orderIdx === clueOrder.length) {
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          if (grid[r][c] === -1) return false;
        }
      }
      return true;
    }

    var clueIdx = clueOrder[orderIdx].idx;
    var clue = clues[clueIdx];
    var pairs = getPatchesFactorPairs(clue.area, clue.shape);

    for (var p = 0; p < pairs.length; p++) {
      var h = pairs[p][0], w = pairs[p][1];
      var minTop = Math.max(0, clue.row - h + 1);
      var maxTop = Math.min(size - h, clue.row);
      var minLeft = Math.max(0, clue.col - w + 1);
      var maxLeft = Math.min(size - w, clue.col);

      for (var top = minTop; top <= maxTop; top++) {
        for (var left = minLeft; left <= maxLeft; left++) {
          if (canPlace(top, left, h, w)) {
            place(top, left, h, w, clueIdx);
            if (solve(orderIdx + 1)) return true;
            removeRect(top, left, h, w);
          }
        }
      }
    }
    return false;
  }

  var solved = solve(0);
  return {
    rects: solved ? rects : [],
    grid: solved ? grid : [],
    solved: solved
  };
}

// ==== Solver Dispatcher ====

async function runQueensSolver() {
  var board = parseQueensBoard();
  if (!board) return null;

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
  if (!board) return null;

  var solution = solveZip(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  var first = solution.path[0];
  var firstIdx = first.row * board.size + first.col;
  var startCenter = getCellCenter(first.row, first.col, board.size);
  if (!startCenter) return { success: false, error: "Could not find start cell" };

  await sendMouseEvent("mousePressed", startCenter.x, startCenter.y);
  await delay(50);

  for (var i = 1; i < solution.path.length; i++) {
    var pos = solution.path[i];
    var center = getCellCenter(pos.row, pos.col, board.size);
    if (center) {
      await sendMouseEvent("mouseMoved", center.x, center.y);
      await delay(30);
    }
  }

  var last = solution.path[solution.path.length - 1];
  var endCenter = getCellCenter(last.row, last.col, board.size);
  if (endCenter) {
    await sendMouseEvent("mouseReleased", endCenter.x, endCenter.y);
  }

  return { success: true };
}

async function runTangoSolver() {
  var board = parseTangoBoard();
  if (!board) return null;

  var solution = solveTango(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  var size = board.size;
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (board.grid[r][c] !== null) continue;
      var target = solution.grid[r][c];
      var idx = r * size + c;

      // Read current value
      var cellEl = document.querySelector('[data-testid="cell-' + idx + '"]');
      var current = null;
      if (cellEl) {
        var svg = cellEl.querySelector('svg[aria-label="Sun"], svg[aria-label="Moon"]');
        if (svg) {
          var lbl = svg.getAttribute("aria-label");
          if (lbl === "Sun") current = "sun";
          else if (lbl === "Moon") current = "moon";
        }
      }

      // Click cycles: empty→sun→moon→empty
      var clicks = 0;
      if (current === null) clicks = (target === 'sun') ? 1 : 2;
      else if (current === 'sun') clicks = (target === 'sun') ? 0 : 1;
      else clicks = (target === 'moon') ? 0 : 2;

      var center = getCellCenter(r, c, size);
      if (!center) continue;
      for (var k = 0; k < clicks; k++) {
        await sendClick(center.x, center.y);
      }
    }
  }

  return { success: true };
}

async function runPatchesSolver() {
  var board = parsePatchesBoard();
  if (!board) return null;

  var solution = solvePatches(board);
  if (!solution.solved) return { success: false, error: "No solution found" };

  // For each clue, drag from clue cell through the rectangle corners
  for (var i = 0; i < board.clues.length; i++) {
    var clue = board.clues[i];
    var rect = solution.rects[i];

    var clueCenter = getCellCenter(clue.row, clue.col, board.size);
    if (!clueCenter) continue;

    var tlCenter = getCellCenter(rect.top, rect.left, board.size);
    var brCenter = getCellCenter(rect.top + rect.height - 1, rect.left + rect.width - 1, board.size);
    if (!tlCenter || !brCenter) continue;

    // Start drag on clue cell, move to top-left, then to bottom-right
    await sendMouseEvent("mousePressed", clueCenter.x, clueCenter.y);
    await delay(30);
    await sendMouseEvent("mouseMoved", tlCenter.x, tlCenter.y);
    await delay(30);
    await sendMouseEvent("mouseMoved", brCenter.x, brCenter.y);
    await delay(30);
    await sendMouseEvent("mouseReleased", brCenter.x, brCenter.y);
    await delay(150);
  }

  return { success: true };
}

async function runSolver(game) {
  switch (game) {
    case "queens": return runQueensSolver();
    case "zip": return runZipSolver();
    case "tango": return runTangoSolver();
    case "patches": return runPatchesSolver();
    default: return null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "SOLVE") {
    runSolver(message.game).then(function(result) {
      if (result) {
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: "Failed to parse board" });
      }
    }).catch(function(err) {
      sendResponse({ success: false, error: "Error: " + err.message });
    });
    return true;
  }
});
