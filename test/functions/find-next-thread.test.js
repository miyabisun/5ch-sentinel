import { describe, it, expect } from "vitest";
import { findNextThread } from "../../src/functions/find-next-thread.js";

describe("findNextThread", () => {
  it("finds next thread by incrementing part number", () => {
    const entries = [
      { threadId: "111", title: "テストスレ Part10", resCount: 50 },
      { threadId: "222", title: "テストスレ Part11", resCount: 10 },
    ];
    const result = findNextThread("テストスレ Part10", entries);
    expect(result).toEqual(entries[1]);
  });

  it("handles zero-padded part numbers (Part09 -> Part10)", () => {
    const entries = [
      { threadId: "111", title: "テストスレ Part09", resCount: 900 },
      { threadId: "222", title: "テストスレ Part10", resCount: 5 },
    ];
    const result = findNextThread("テストスレ Part09", entries);
    expect(result).toEqual(entries[1]);
  });

  it("prefers rightmost number for incrementing", () => {
    const entries = [
      { threadId: "111", title: "5ch総合 Part3", resCount: 100 },
      { threadId: "222", title: "5ch総合 Part4", resCount: 10 },
    ];
    // "5ch総合 Part3" has two numbers: 5 and 3
    // Should increment 3 -> 4 (rightmost), not 5 -> 6
    const result = findNextThread("5ch総合 Part3", entries);
    expect(result).toEqual(entries[1]);
  });

  it("returns null when title has no numbers", () => {
    const entries = [
      { threadId: "111", title: "なにかのスレッド", resCount: 100 },
    ];
    const result = findNextThread("数字なしタイトル", entries);
    expect(result).toBeNull();
  });

  it("returns null when no matching next thread exists", () => {
    const entries = [
      { threadId: "111", title: "全然関係ないスレ Part1", resCount: 100 },
    ];
    const result = findNextThread("テストスレ Part5", entries);
    expect(result).toBeNull();
  });

  it("returns null for empty subject entries", () => {
    const result = findNextThread("テストスレ Part1", []);
    expect(result).toBeNull();
  });

  it("does not false-match when title starts with a number", () => {
    const entries = [
      { threadId: "111", title: "無関係スレ 11", resCount: 100 },
      { threadId: "222", title: "11スレ目", resCount: 50 },
    ];
    // "10スレ目" — number at start, prefix is empty
    // Should match "11スレ目", not "無関係スレ 11"
    const result = findNextThread("10スレ目", entries);
    expect(result).toEqual(entries[1]);
  });

  it("handles single digit increment (Part9 -> Part10)", () => {
    const entries = [
      { threadId: "222", title: "テストスレ Part10", resCount: 5 },
    ];
    const result = findNextThread("テストスレ Part9", entries);
    expect(result).toEqual(entries[0]);
  });
});
