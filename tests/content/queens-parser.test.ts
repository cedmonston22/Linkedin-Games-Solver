import { describe, it, expect } from "vitest";

/**
 * The parser uses a regex to extract data from aria-labels.
 * We test the regex here since the full parser needs a DOM environment.
 */

const CELL_LABEL_REGEX =
  /^(.+?) (?:cell )?of color (.+), row (\d+), column (\d+)$/;

function parseCellLabel(label: string) {
  const match = CELL_LABEL_REGEX.exec(label);
  if (!match) return null;
  return {
    state: match[1]!,
    color: match[2]!,
    row: parseInt(match[3]!, 10),
    col: parseInt(match[4]!, 10),
  };
}

describe("Queens cell label parser", () => {
  it("parses an empty cell", () => {
    const result = parseCellLabel(
      "Empty cell of color Pastel Green, row 6, column 2"
    );
    expect(result).toEqual({
      state: "Empty",
      color: "Pastel Green",
      row: 6,
      col: 2,
    });
  });

  it("parses a single-word color", () => {
    const result = parseCellLabel(
      "Empty cell of color Lavender, row 1, column 1"
    );
    expect(result).toEqual({
      state: "Empty",
      color: "Lavender",
      row: 1,
      col: 1,
    });
  });

  it("parses a multi-word color", () => {
    const result = parseCellLabel(
      "Empty cell of color Peach Orange, row 2, column 1"
    );
    expect(result).toEqual({
      state: "Empty",
      color: "Peach Orange",
      row: 2,
      col: 1,
    });
  });

  it("parses a queen cell (no 'cell' word in label)", () => {
    const result = parseCellLabel(
      "Queen of color Soft Blue, row 7, column 8"
    );
    expect(result).toEqual({
      state: "Queen",
      color: "Soft Blue",
      row: 7,
      col: 8,
    });
  });

  it("parses an empty cell with 'cell' word in label", () => {
    const result = parseCellLabel(
      "Empty cell of color Soft Blue, row 3, column 8"
    );
    expect(result).toEqual({
      state: "Empty",
      color: "Soft Blue",
      row: 3,
      col: 8,
    });
  });

  it("returns null for invalid labels", () => {
    expect(parseCellLabel("something else")).toBeNull();
    expect(parseCellLabel("")).toBeNull();
  });
});
