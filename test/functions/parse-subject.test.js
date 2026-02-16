import { describe, it, expect } from "vitest";
import { parseSubjectTxt } from "../../src/functions/parse-subject.js";

describe("parseSubjectTxt", () => {
  it("parses real subject.txt lines", () => {
    const text = [
      "1771127145.dat<>【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843 (491)",
      "1771200000.dat<>【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844 (23)",
    ].join("\n");

    const result = parseSubjectTxt(text);
    expect(result).toEqual([
      { threadId: "1771127145", title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843", resCount: 491 },
      { threadId: "1771200000", title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844", resCount: 23 },
    ]);
  });

  it("skips empty lines", () => {
    const text = "1771127145.dat<>スレ Part1 (100)\n\n\n1771200000.dat<>スレ Part2 (200)\n";
    const result = parseSubjectTxt(text);
    expect(result).toHaveLength(2);
    expect(result[0].threadId).toBe("1771127145");
    expect(result[1].threadId).toBe("1771200000");
  });

  it("skips malformed lines", () => {
    const text = [
      "1771127145.dat<>正常行 (100)",
      "this is not a valid line",
      "no-dat-here<>壊れた行 (50)",
      "1771200000.dat<>正常行2 (200)",
    ].join("\n");

    const result = parseSubjectTxt(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ threadId: "1771127145", title: "正常行", resCount: 100 });
    expect(result[1]).toEqual({ threadId: "1771200000", title: "正常行2", resCount: 200 });
  });

  it("returns empty array for empty string", () => {
    expect(parseSubjectTxt("")).toEqual([]);
  });

  it("trims whitespace from title", () => {
    const text = "1771127145.dat<> スペース付きタイトル  (100)";
    const result = parseSubjectTxt(text);
    expect(result[0].title).toBe("スペース付きタイトル");
  });

  it("parses resCount as integer", () => {
    const text = "1771127145.dat<>テスト (0491)";
    const result = parseSubjectTxt(text);
    expect(result[0].resCount).toBe(491);
  });

  it("handles title containing parentheses", () => {
    const text = "1771127145.dat<>スレ (仮) Part1 (300)";
    const result = parseSubjectTxt(text);
    // Greedy .+ captures up to the last '(' so inner parens become part of title
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("スレ (仮) Part1");
    expect(result[0].resCount).toBe(300);
  });
});
