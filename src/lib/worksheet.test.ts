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

import { reconcileVisual, visualSvg, emptyVisual } from "./worksheetVisual";
import { limitFormats } from "./worksheet";
describe("worksheet visuals", () => {
  const obj = { ...emptyVisual(), kind: "objects" as const };
  it("4 + 2 shows four then two objects", () => {
    const v = reconcileVisual("4 + 2 = ____", { ...obj, groups: [3, 3] });
    expect(v.groups).toEqual([4, 2]);
    expect((visualSvg(v)!.svg.match(/fill="#f97316"/g) || []).length).toBe(6);
  });
  it("7 - 3 shows seven with three crossed out", () => {
    const v = reconcileVisual("7 - 3 = ____", obj);
    expect(v.groups).toEqual([7]); expect(v.takeAway).toBe(3);
    expect((visualSvg(v)!.svg.match(/<line/g) || []).length).toBe(6);
  });
  it("keeps at most two question types by default", () => {
    expect(limitFormats([{ format: "mcq" }, { format: "short" }, { format: "mcq" }, { format: "matching" }]).map((s) => s.format)).toEqual(["mcq", "short", "mcq"]);
  });
});
