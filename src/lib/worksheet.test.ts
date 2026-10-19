import { describe, expect, it } from "vitest";
import { blankParts, normalizeWorksheet, stripNum, answerKeyLines } from "./worksheet";

describe("worksheet", () => {
  it("removes duplicate numbering", () => {
    expect(stripNum("1. Which part?")).toBe("Which part?");
    expect(stripNum("Section A: Multiple choice")).toBe("Multiple choice");
    expect(stripNum("1/3 + 1/5 = ___")).toBe("1/3 + 1/5 = ___");
  });
  it("turns underscores into blanks", () => {
    expect(blankParts("The ____ holds the plant.")).toEqual(["The ", null, " holds the plant."]);
  });
  it("totals marks and keeps the answer key separate from questions", () => {
    const ws = normalizeWorksheet({ title: "T", sections: [{ heading: "A", format: "short", questions: [{ prompt: "Q", marks: 2, answer: "X" }, { prompt: "R", marks: 3, answer: "Y" }] }] });
    expect(ws.totalMarks).toBe(5);
    expect(answerKeyLines(ws)).toEqual(["Section A: A", "1. X", "2. Y"]);
  });
});
