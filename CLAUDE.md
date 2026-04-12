# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that solves LinkedIn games: Queens, Zip, Tango, and Patches. Also supports archivedqueens.com. Built with TypeScript, vanilla HTML/CSS/TS (no UI framework). The `test-extension/` folder contains the deployable extension as plain JS; `src/` contains the TypeScript source.

## Commands

```bash
npm run typecheck    # TypeScript type checking only
npm run lint         # ESLint
npm test             # Run all tests (vitest)
npm run test:watch   # Run tests in watch mode
npx vitest run tests/solvers/queens.test.ts  # Run a single test file
```

To load the extension in Chrome: go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the `test-extension/` folder.

## Architecture

```
Popup (UI) → Content Script (parser + solver + injector) → Background Worker (debugger clicks)
```

### Message flow for solving a game
1. User clicks **Solve** in the popup
2. Popup sends `{type: "SOLVE"}` to the content script via `chrome.tabs.sendMessage`
3. **Content script** runs the parser, solver, and injector all locally:
   - **Parser** (`src/content/<site>/parser.ts`) reads the DOM and extracts the board
   - **Solver** (`src/solvers/<game>.ts`) — pure backtracking algorithm, no DOM dependency
   - **Injector** (`src/content/<site>/injector.ts`) applies the solution to the DOM
4. For **LinkedIn**: injector sends `{type: "CLICK_CELL", x, y}` to the background worker, which uses `chrome.debugger` API to dispatch trusted mouse events (LinkedIn checks `event.isTrusted`)
5. For **archivedqueens.com**: injector dispatches `mousedown` events directly (no debugger needed)
6. Each cell requires TWO clicks/events to place a queen (first = X marker, second = queen)

### Key design decisions
- **Solver runs in content script**, not background worker. Avoids message-passing complexity.
- **LinkedIn requires Chrome Debugger API** for clicks because LinkedIn checks `event.isTrusted` on all events. Regular `dispatchEvent()` and `.click()` are silently ignored.
- **archivedqueens.com uses `mousedown`** events, not `click`. Simple `dispatchEvent` works.
- **Two separate content scripts**: one for LinkedIn, one for archivedqueens.com (registered in manifest).
- **Content scripts must be plain JS** (no ES module syntax). Vite's bundled output had issues with Chrome content script injection — the `test-extension/` folder contains hand-written JS that works reliably.

### Solvers are pure functions
Solvers take a typed board state and return a solution. Zero browser/DOM dependencies — unit testable with Vitest without any browser environment.

### Adding a new game
1. Define board/solution types in `src/types/index.ts`
2. Create `src/solvers/<game>.ts` with the solving algorithm
3. Create `src/content/<site>/parser.ts` to extract board state from DOM
4. Create `src/content/<site>/injector.ts` to apply solutions to DOM
5. Add content script entry point and update manifest
6. Update popup detection in `src/popup/popup.ts`
7. Add tests in `tests/solvers/<game>.test.ts`
8. Add the working JS to `test-extension/`

### Adding a new site for an existing game
1. Create parser and injector under `src/content/<site>/`
2. Create a content script entry point (`src/content/<site>-index.ts`)
3. Add the site's URL match pattern to `src/manifest.json`
4. Update popup detection in `src/popup/popup.ts`
5. Add the working JS to `test-extension/`

## Current State

- **Queens (LinkedIn)**: Fully working. Parser reads `aria-label` attributes. Debugger API clicks.
- **Queens (archivedqueens.com)**: Fully working. Parser reads CSS grid + `background-color`. Mousedown events.
- **Zip (LinkedIn)**: Fully working. Parser reads `aria-label="Number X"` and `trail-cell-wall--{direction}` classes. Debugger API drag (mousePressed → mouseMoved → mouseReleased).
- **Tango (LinkedIn)**: Fully working. Parser reads `lotka-cell-content` for Sun/Moon values and `lotka-cell-edge--{right|down}` with SVG `aria-label="Equal"/"Cross"` for constraints. Click-to-cycle injection (empty→sun→moon).
- **Patches**: Not yet started.

## DOM Parsing

### LinkedIn Queens
- Board: `#queens-game-board` → `[data-testid="interactive-grid"]`
- Cells: `[data-testid^="cell-"]` with `aria-label="Empty cell of color {color}, row {row}, column {col}"` or `"Queen of color {color}, row {row}, column {col}"`
- Grid size from CSS variable `--_6afcf54e` or derived from max row/col in aria-labels
- Cell index: `data-testid="cell-{row * size + col}"`

### archivedqueens.com
- Board: `div.board` with `grid-template-columns: repeat(N, 1fr)`
- Cells: plain child `<div>` elements with inline `background-color` for regions
- Content: empty = no text, X marker = `x` text, queen = `🜲` text

### LinkedIn Zip
- Container: `[data-testid="zip-game-container"]`
- Board: `[data-testid="interactive-grid"]` with CSS var `--_6afcf54e` for grid size
- Cells: `[data-testid^="cell-"]` with `data-cell-idx` attribute
- Checkpoints: cells with `aria-label="Number X"` (e.g. `"Number 1"`, `"Number 5"`)
- Walls: child `<div>` elements with class `trail-cell-wall--{right|left|top|bottom}` (unobfuscated) or `_63fae645` (right) / `_6177935e` (left) (obfuscated)
- Walls come in pairs: if cell (r,c) has `wall--right`, then cell (r,c+1) has `wall--left`
- Input: dragging (mousePressed → mouseMoved through path → mouseReleased)

### LinkedIn Tango
- Internal name: "lotka"
- Board: `.grid-board-wrapper` with `.lotka-cell` children having `data-cell-idx`
- Cell values: `.lotka-cell-content` with text "Sun", "Moon", or SVG `aria-label="Empty"`
- Locked cells: `.lotka-cell-content--locked`
- Edge constraints: `.lotka-cell-edge--right` (horizontal) or `.lotka-cell-edge--down` (vertical)
- Constraint type: SVG child with `aria-label="Equal"` (=, same) or `aria-label="Cross"` (x, different)
- Input: clicking cycles Empty → Sun → Moon → Empty (1 click = Sun, 2 clicks = Moon)
- Rules: equal Sun/Moon per row/col, no 3 consecutive same, edge constraints
