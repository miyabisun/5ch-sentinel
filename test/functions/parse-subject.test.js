import { describe, it, expect } from "vitest";
import { parseSubjectTxt } from "../../src/functions/parse-subject.js";

describe("parseSubjectTxt", () => {
  it("parses multiple valid lines", () => {
    const text = [
      "1234567890.dat<>テストスレッド Part1 (100)",
      "9876543210.dat<>もう一つのスレッド (250)",
    ].join("\n");

    const result = parseSubjectTxt(text);
    expect(result).toEqual([
      { threadId: "1234567890", title: "テストスレッド Part1", resCount: 100 },
      { threadId: "9876543210", title: "もう一つのスレッド", resCount: 250 },
    ]);
  });

  it("skips empty lines", () => {
    const text = "1234567890.dat<>テスト (10)\n\n\n9876543210.dat<>テスト2 (20)\n";
    const result = parseSubjectTxt(text);
    expect(result).toHaveLength(2);
  });

  it("skips malformed lines", () => {
    const text = [
      "1234567890.dat<>正常行 (100)",
      "this is not a valid line",
      "no-dat-here<>壊れた行 (50)",
      "9876543210.dat<>正常行2 (200)",
    ].join("\n");

    const result = parseSubjectTxt(text);
    expect(result).toEqual([
      { threadId: "1234567890", title: "正常行", resCount: 100 },
      { threadId: "9876543210", title: "正常行2", resCount: 200 },
    ]);
  });

  it("returns empty array for empty string", () => {
    expect(parseSubjectTxt("")).toEqual([]);
  });

  it("trims whitespace from title", () => {
    const text = "1234567890.dat<> スペース付きタイトル  (100)";
    const result = parseSubjectTxt(text);
    expect(result[0].title).toBe("スペース付きタイトル");
  });
});
