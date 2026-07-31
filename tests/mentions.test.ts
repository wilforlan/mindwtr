import { describe, expect, it } from "vitest";
import {
  extractAllWikiLinkTitles,
  extractMentionSnippets,
  rankRelatedByCoOccurrence,
} from "@shared/wiki-link";

describe("Wiki-link mention indexing", () => {
  it("extracts every wiki title from a block of text", () => {
    expect(
      extractAllWikiLinkTitles("See [[Focus]] and [[Deep Work]] today")
    ).toEqual(["Focus", "Deep Work"]);
  });

  it("builds bookmark snippets from TipTap blocks that mention an item", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Morning pages." }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "I want more " },
            {
              type: "text",
              text: "Focus",
              marks: [{ type: "wikiLink", attrs: { title: "Focus" } }],
            },
            { type: "text", text: " this week." },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Also [[Focus]] with [[Sleep]]." }],
        },
      ],
    };

    const snippets = extractMentionSnippets({
      contentJson: JSON.stringify(content),
      itemTitle: "Focus",
    });

    expect(snippets).toEqual([
      "I want more Focus this week.",
      "Also [[Focus]] with [[Sleep]].",
    ]);
  });

  it("ranks related items by how often they co-occur with the target", () => {
    const ranked = rankRelatedByCoOccurrence({
      targetTitle: "Focus",
      mentionTitlesByNote: [
        ["Focus", "Sleep", "Deep Work"],
        ["Focus", "Sleep"],
        ["Focus", "Exercise"],
      ],
    });

    expect(ranked.map((item) => item.title)).toEqual([
      "Sleep",
      "Deep Work",
      "Exercise",
    ]);
    expect(ranked[0]?.count).toBe(2);
  });
});
