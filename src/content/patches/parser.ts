import type { PatchesBoard, PatchesClue, PatchesShape } from "../../types";

const CLUE_REGEX =
  /Row (\d+), column (\d+), (.+?) clue, (\d+) cells/;

function parseShape(shapeText: string): PatchesShape {
  if (shapeText === "square") return "square";
  if (shapeText === "tall rectangle") return "tall";
  if (shapeText === "wide rectangle") return "wide";
  return "any"; // "freeform"
}

export function parsePatchesBoard(): PatchesBoard | null {
  const grid = document.querySelector<HTMLElement>(
    '[data-testid="interactive-grid"]'
  );
  if (!grid) return null;

  const allCells = grid.querySelectorAll<HTMLElement>('[data-testid^="cell-"]');
  const cells: HTMLElement[] = [];
  for (const c of allCells) {
    if (/^cell-\d+$/.test(c.getAttribute("data-testid") ?? "")) cells.push(c);
  }
  if (cells.length === 0) return null;

  const size = Math.round(Math.sqrt(cells.length));
  if (size * size !== cells.length) return null;

  const clues: PatchesClue[] = [];

  cells.forEach((cell) => {
    const ariaLabel = cell.getAttribute("aria-label") ?? "";
    const match = CLUE_REGEX.exec(ariaLabel);
    if (!match) return;

    const row = parseInt(match[1]!, 10) - 1;
    const col = parseInt(match[2]!, 10) - 1;
    const shape = parseShape(match[3]!);
    const area = parseInt(match[4]!, 10);

    clues.push({ row, col, area, shape });
  });

  if (clues.length === 0) return null;

  return { size, clues };
}
