import { describe, it, expect } from "vitest";
import { buildWarningMessage } from "../../src/functions/build-message.js";

describe("buildWarningMessage", () => {
  it("builds exact message format with next thread", () => {
    const msg = buildWarningMessage({
      title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      url: "https://kizuna.5ch.net/test/read.cgi/iPhone/1771127145/",
      resCount: 491,
      datSizeKB: 1025.0,
      nextThread: {
        title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844",
        url: "https://kizuna.5ch.net/test/read.cgi/iPhone/1771200000/",
      },
    });

    const expected =
      "⚠️ **スレッド終了警告**\n" +
      "タイトル: 【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843\n" +
      "URL: https://kizuna.5ch.net/test/read.cgi/iPhone/1771127145/\n" +
      "現在のレス数: 491\n" +
      "Datサイズ: 1025.0KB\n\n" +
      "⬇️ 次スレ候補:\n" +
      "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844\n" +
      "https://kizuna.5ch.net/test/read.cgi/iPhone/1771200000/";
    expect(msg).toBe(expected);
  });

  it("shows fallback text when no next thread found", () => {
    const msg = buildWarningMessage({
      title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      url: "https://kizuna.5ch.net/test/read.cgi/iPhone/1771127145/",
      resCount: 491,
      datSizeKB: 1025.0,
      nextThread: null,
    });

    expect(msg).toMatch(/⬇️ 次スレ候補:\n※次スレ候補が見つかりませんでした$/);
    expect(msg).not.toContain("undefined");
  });

  it("shows '不明' when datSizeKB is null", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part100",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/",
      resCount: 990,
      datSizeKB: null,
      nextThread: null,
    });

    expect(msg).toMatch(/Datサイズ: 不明KB/);
    expect(msg).not.toContain("null");
  });

  it("shows '不明' when datSizeKB is undefined", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part100",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/",
      resCount: 990,
      datSizeKB: undefined,
      nextThread: null,
    });

    expect(msg).toMatch(/Datサイズ: 不明KB/);
  });

  it("formats fractional dat size to one decimal place", () => {
    const msg = buildWarningMessage({
      title: "スレッド Part1",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/",
      resCount: 985,
      datSizeKB: 512.345,
      nextThread: null,
    });

    expect(msg).toMatch(/Datサイズ: 512\.3KB/);
  });

  it("shows dead notification header when dead is true", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part100",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/",
      resCount: 1002,
      datSizeKB: 500.0,
      nextThread: null,
      dead: true,
    });

    expect(msg).toMatch(/^🔴 \*\*スレッド終了通知\*\*/);
    expect(msg).not.toContain("終了警告");
  });

  it("shows warning header when dead is false", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part100",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/",
      resCount: 990,
      datSizeKB: 500.0,
      nextThread: null,
      dead: false,
    });

    expect(msg).toMatch(/^⚠️ \*\*スレッド終了警告\*\*/);
    expect(msg).not.toContain("終了通知");
  });

  it("shows dat落ち status when resCount is null", () => {
    const msg = buildWarningMessage({
      title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5843",
      url: "https://kizuna.5ch.net/test/read.cgi/iPhone/1771127145/",
      resCount: null,
      datSizeKB: null,
      nextThread: {
        title: "【ブルアカ】ブルーアーカイブ -Blue Archive- Part5844",
        url: "https://kizuna.5ch.net/test/read.cgi/iPhone/1771200000/",
      },
    });

    expect(msg).toMatch(/状態: dat落ち \(subject\.txt から消失\)/);
    expect(msg).not.toContain("現在のレス数");
    expect(msg).not.toContain("Datサイズ");
    expect(msg).toContain("Part5844");
  });
});
