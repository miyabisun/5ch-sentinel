import { describe, it, expect } from "vitest";
import { parseThreadUrl } from "../../src/functions/parse-thread-url.js";

describe("parseThreadUrl", () => {
  it("parses test/read.cgi/ format URL", () => {
    const result = parseThreadUrl(
      "https://kizuna.5ch.net/test/read.cgi/iPhone/1771127145/"
    );
    expect(result).toEqual({
      server: "kizuna",
      board: "iPhone",
      threadId: "1771127145",
    });
  });

  it("parses legacy short URL format", () => {
    const result = parseThreadUrl(
      "https://kizuna.5ch.net/iPhone/1771127145/"
    );
    expect(result).toEqual({
      server: "kizuna",
      board: "iPhone",
      threadId: "1771127145",
    });
  });

  it("parses URL without trailing slash", () => {
    const result = parseThreadUrl(
      "https://eagle.5ch.net/test/read.cgi/livejupiter/1700000000"
    );
    expect(result).toEqual({
      server: "eagle",
      board: "livejupiter",
      threadId: "1700000000",
    });
  });

  it("parses http URL", () => {
    const result = parseThreadUrl(
      "http://eagle.5ch.net/test/read.cgi/livejupiter/1700000000/"
    );
    expect(result).toEqual({
      server: "eagle",
      board: "livejupiter",
      threadId: "1700000000",
    });
  });

  it("returns null for invalid URL", () => {
    expect(parseThreadUrl("https://example.com/foo")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseThreadUrl("")).toBeNull();
  });

  it("returns null for non-5ch URL", () => {
    expect(
      parseThreadUrl("https://eagle.2ch.net/test/read.cgi/news/1700000000/")
    ).toBeNull();
  });
});
