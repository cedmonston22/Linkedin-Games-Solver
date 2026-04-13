# LinkedIn Games Solver

A Chrome extension that automatically solves LinkedIn's daily puzzle games. Navigate to a game, click Solve, and watch it fill in the answer.

![Extension popup showing idle and active states](docs/popup-preview.png)

## Supported Games

| Game | Algorithm | Description |
|------|-----------|-------------|
| **Queens** | Backtracking with constraint pruning | Place one queen per row, column, and color region with no adjacent queens |
| **Zip** | Depth-first search with checkpoint ordering | Find a Hamiltonian path through the grid visiting numbered checkpoints in order |
| **Tango** | Backtracking with constraint propagation | Fill a grid with suns and moons satisfying balance, adjacency, and edge constraints |
| **Patches** | Backtracking with most-constrained-first heuristic | Place rectangles of given areas to tile the board without overlap |

Also supports [archivedqueens.com](https://www.archivedqueens.com) for past Queens puzzles.

## How It Works

```
Popup UI → Content Script (parse + solve + inject) → Background Worker (trusted clicks)
```

1. **Parse** -- Content script reads the game board from the DOM (aria-labels, CSS classes, grid structure)
2. **Solve** -- Pure algorithm runs entirely in the content script, no network calls
3. **Inject** -- Solution is applied back to the DOM via simulated user input

LinkedIn checks `event.isTrusted` on all interactions, so the extension uses Chrome's Debugger API to dispatch real mouse events that the page accepts. For archivedqueens.com, simple `mousedown` events work directly.

## Architecture

```
src/
├── solvers/          # Pure solving algorithms (zero DOM dependencies)
│   ├── queens.ts     # Backtracking, row-by-row with column/region/adjacency pruning
│   ├── zip.ts        # DFS pathfinding with wall detection and checkpoint ordering
│   ├── tango.ts      # Constraint propagation with running row/col counts
│   └── patches.ts    # Rectangle packing with most-constrained-first ordering
├── content/          # DOM parsers and solution injectors per site
│   ├── queens/       # LinkedIn Queens parser + injector
│   ├── zip/          # LinkedIn Zip parser + injector
│   ├── tango/        # LinkedIn Tango parser + injector
│   ├── patches/      # LinkedIn Patches parser + injector
│   └── archived/     # archivedqueens.com parser + injector
├── background/       # Service worker for Chrome Debugger API clicks
├── popup/            # Extension popup UI
└── types/            # Shared TypeScript types
```

The solvers are pure functions -- they take a typed board state and return a solution with no browser dependencies. This makes them fully unit-testable without any browser environment.

## Tech Stack

- **TypeScript** -- strict types, no `any`
- **Chrome Manifest V3** -- service worker, content scripts, debugger API
- **Vitest** -- 22 tests across all solvers and parsers
- **Vanilla HTML/CSS** -- no UI framework, no build step for the extension

## Running Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

To load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `test-extension/` folder

Then navigate to any LinkedIn game page and click the extension icon.

## Solver Deep Dive

### Queens
Places queens row by row using backtracking. For each row, tries each column and validates against three constraints: no duplicate columns, no duplicate color regions, and no adjacent queens (including diagonals). Uses Sets for O(1) column/region lookups.

### Zip
Finds a path that visits every cell exactly once, hitting numbered checkpoints in order. Uses DFS from checkpoint 1, exploring orthogonal neighbors. Walls between cells are encoded as normalized strings for O(1) blocking checks.

### Tango
Fills empty cells with sun or moon values using backtracking. Maintains running per-row and per-column counts to validate balance constraints without rescanning. Pre-computes an edge constraint lookup map for O(1) access to same/different relationships between adjacent cells.

### Patches
Places rectangles on the grid using backtracking with a most-constrained-first heuristic -- it solves clues with the fewest possible placements first, pruning the search tree early. For each clue, generates all valid (height, width) factor pairs and tries every position that contains the clue cell.

## Disclaimer

This project is for educational purposes and personal use. It is not affiliated with or endorsed by LinkedIn. Use at your own risk -- automated interaction with LinkedIn may violate their Terms of Service.
