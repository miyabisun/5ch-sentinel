import { describe, it, expect } from "vitest";
import { buildWarningMessage } from "../../src/functions/build-message.js";

describe("buildWarningMessage", () => {
  it("builds complete message with all info including next thread", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part10",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/",
      resCount: 985,
      datSizeKB: 512.3,
      nextThread: {
        title: "テストスレ Part11",
        url: "https://eagle.5ch.net/test/read.cgi/livejupiter/9999999999/",
      },
    });

    expect(msg).toContain("スレッド終了警告");
    expect(msg).toContain("テストスレ Part10");
    expect(msg).toContain("1234567890");
    expect(msg).toContain("985");
    expect(msg).toContain("512.3");
    expect(msg).toContain("テストスレ Part11");
    expect(msg).toContain("9999999999");
  });

  it("shows fallback text when no next thread", () => {
    const msg = buildWarningMessage({
      title: "テストスレ Part10",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/",
      resCount: 985,
      datSizeKB: 512.3,
      nextThread: null,
    });

    expect(msg).toContain("次スレ候補が見つかりませんでした");
    expect(msg).not.toContain("undefined");
  });

  it("shows '不明' when datSizeKB is null", () => {
    const msg = buildWarningMessage({
      title: "テストスレ",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/",
      resCount: 990,
      datSizeKB: null,
      nextThread: null,
    });

    expect(msg).toContain("不明");
  });

  it("shows '不明' when datSizeKB is undefined", () => {
    const msg = buildWarningMessage({
      title: "テストスレ",
      url: "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/",
      resCount: 990,
      datSizeKB: undefined,
      nextThread: null,
    });

    expect(msg).toContain("不明");
  });
});
