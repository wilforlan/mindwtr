import { describe, expect, it } from "vitest";
import { extractWikiLinkTitle } from "@shared/wiki-link";

describe("Wiki-link parsing", () => {
  it("extracts a title from a completed wiki-link token", () => {
    expect(extractWikiLinkTitle("hello [[Focus]]")).toBe("Focus");
  });

  it("returns null when there is no completed wiki-link", () => {
    expect(extractWikiLinkTitle("hello [[Focus")).toBeNull();
    expect(extractWikiLinkTitle("plain text")).toBeNull();
  });

  it("trims whitespace inside the brackets", () => {
    expect(extractWikiLinkTitle("[[  Deep Work  ]]")).toBe("Deep Work");
  });
});
