import { describe, expect, it } from "vitest";
import {
  extractOpenWikiQuery,
  rankWikiSearchResults,
} from "@shared/wiki-link";

describe("Wiki-link search while typing", () => {
  it("detects an open [[ query before the cursor", () => {
    expect(extractOpenWikiQuery("Hello [[Foc")).toEqual({
      query: "Foc",
      fromOffset: 6,
    });
    expect(extractOpenWikiQuery("[[")).toEqual({
      query: "",
      fromOffset: 0,
    });
  });

  it("ignores completed wiki links and text without an open token", () => {
    expect(extractOpenWikiQuery("See [[Focus]] and more")).toBeNull();
    expect(extractOpenWikiQuery("plain text")).toBeNull();
    expect(extractOpenWikiQuery("almost [not")).toBeNull();
  });

  it("ranks titles that start with the query ahead of substring matches", () => {
    const ranked = rankWikiSearchResults({
      query: "fo",
      titles: ["Deep Focus", "Focus", "Food", "Sleep"],
    });

    expect(ranked.map((item) => item.title)).toEqual([
      "Focus",
      "Food",
      "Deep Focus",
    ]);
  });
});
