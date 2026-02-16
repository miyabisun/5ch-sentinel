import { describe, it, expect } from "vitest";
import { findNextThread } from "../../src/functions/find-next-thread.js";

describe("findNextThread", () => {
  it("finds next thread for real ブルアカ title", () => {
    const entries = [
      { threadId: "1771127145", title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843", resCount: 491 },
      { threadId: "1771200000", title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844", resCount: 23 },
    ];
    const result = findNextThread(
      "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      entries
    );
    expect(result).toEqual(entries[1]);
  });

  it("handles zero-padded part numbers (Part09 -> Part10)", () => {
    const entries = [
      { threadId: "1770000000", title: "テストスレ Part09", resCount: 900 },
      { threadId: "1770100000", title: "テストスレ Part10", resCount: 5 },
    ];
    const result = findNextThread("テストスレ Part09", entries);
    expect(result).toEqual(entries[1]);
  });

  it("prefers rightmost number for incrementing", () => {
    const entries = [
      { threadId: "1770000000", title: "5ch総合 Part3", resCount: 100 },
      { threadId: "1770100000", title: "5ch総合 Part4", resCount: 10 },
      { threadId: "1770200000", title: "6ch総合 Part3", resCount: 10 },
    ];
    // "5ch総合 Part3" has two numbers: 5 and 3
    // Should increment 3 -> 4 (rightmost), not 5 -> 6
    const result = findNextThread("5ch総合 Part3", entries);
    expect(result).toEqual(entries[1]);
  });

  it("returns null when title has no numbers", () => {
    const entries = [
      { threadId: "1770000000", title: "なにかのスレッド", resCount: 100 },
    ];
    const result = findNextThread("数字なしタイトル", entries);
    expect(result).toBeNull();
  });

  it("returns null when no matching next thread exists", () => {
    const entries = [
      { threadId: "1770000000", title: "全然関係ないスレ Part1", resCount: 100 },
    ];
    const result = findNextThread(
      "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      entries
    );
    expect(result).toBeNull();
  });

  it("returns null for empty subject entries", () => {
    const result = findNextThread(
      "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      []
    );
    expect(result).toBeNull();
  });

  it("does not false-match when title starts with a number", () => {
    const entries = [
      { threadId: "1770000000", title: "無関係スレ 11", resCount: 100 },
      { threadId: "1770100000", title: "11スレ目", resCount: 50 },
    ];
    // "10スレ目" — number at start, prefix is empty
    // Should match "11スレ目", not "無関係スレ 11"
    const result = findNextThread("10スレ目", entries);
    expect(result).toEqual(entries[1]);
  });

  it("handles single digit increment (Part9 -> Part10)", () => {
    const entries = [
      { threadId: "1770100000", title: "テストスレ Part10", resCount: 5 },
    ];
    const result = findNextThread("テストスレ Part9", entries);
    expect(result).toEqual(entries[0]);
  });
});
