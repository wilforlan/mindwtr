export const extractWikiLinkTitle = (text: string): string | null => {
  const match = /\[\[([^\]]+)\]\]/.exec(text);
  if (!match) {
    return null;
  }
  const title = match[1]?.trim() ?? "";
  if (!title) {
    return null;
  }
  return title;
};

export type OpenWikiQuery = {
  query: string;
  fromOffset: number;
};

export const extractOpenWikiQuery = (
  textBeforeCursor: string
): OpenWikiQuery | null => {
  const openIndex = textBeforeCursor.lastIndexOf("[[");
  if (openIndex === -1) {
    return null;
  }
  const afterOpen = textBeforeCursor.slice(openIndex + 2);
  if (afterOpen.includes("]]") || afterOpen.includes("[")) {
    return null;
  }
  return {
    query: afterOpen,
    fromOffset: openIndex,
  };
};

export type WikiSearchResult = {
  title: string;
  score: number;
};

export const rankWikiSearchResults = (options: {
  query: string;
  titles: string[];
}): WikiSearchResult[] => {
  const query = options.query.trim().toLowerCase();
  const unique = [...new Set(options.titles.map((title) => title.trim()))].filter(
    Boolean
  );

  if (!query) {
    return unique
      .slice()
      .sort((left, right) => left.localeCompare(right))
      .map((title) => ({ title, score: 0 }));
  }

  return unique
    .flatMap((title) => {
      const lower = title.toLowerCase();
      if (!lower.includes(query)) {
        return [];
      }
      const startsWith = lower.startsWith(query);
      return [
        {
          title,
          score: startsWith ? 2 : 1,
        },
      ];
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.title.localeCompare(right.title);
    });
};

export const extractAllWikiLinkTitles = (text: string): string[] => {
  const titles: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  for (const match of text.matchAll(pattern)) {
    const title = match[1]?.trim() ?? "";
    if (title) {
      titles.push(title);
    }
  }
  return titles;
};

type TipTapMark = {
  type: string;
  attrs?: { title?: string };
};

type TipTapNode = {
  type: string;
  text?: string;
  marks?: TipTapMark[];
  content?: TipTapNode[];
};

const collectText = (node: TipTapNode): string => {
  if (node.type === "text") {
    return node.text ?? "";
  }
  return (node.content ?? []).map(collectText).join("");
};

const blockMentionsTitle = (node: TipTapNode, itemTitle: string): boolean => {
  const target = itemTitle.trim().toLowerCase();
  const walk = (current: TipTapNode): boolean => {
    if (current.type === "text") {
      const marked = (current.marks ?? []).some(
        (mark) =>
          mark.type === "wikiLink" &&
          (mark.attrs?.title ?? "").trim().toLowerCase() === target
      );
      if (marked) {
        return true;
      }
      return extractAllWikiLinkTitles(current.text ?? "").some(
        (title) => title.toLowerCase() === target
      );
    }
    return (current.content ?? []).some(walk);
  };
  return walk(node);
};

const isSnippetBlock = (node: TipTapNode): boolean => {
  return (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "subheading" ||
    node.type === "blockquote" ||
    node.type === "listItem"
  );
};

export const extractMentionSnippets = (options: {
  contentJson: string;
  itemTitle: string;
}): string[] => {
  let doc: TipTapNode;
  try {
    doc = JSON.parse(options.contentJson) as TipTapNode;
  } catch {
    return [];
  }

  const snippets: string[] = [];

  const visit = (node: TipTapNode): void => {
    if (isSnippetBlock(node) && blockMentionsTitle(node, options.itemTitle)) {
      const text = collectText(node).trim();
      if (text) {
        snippets.push(text);
      }
      return;
    }
    for (const child of node.content ?? []) {
      visit(child);
    }
  };

  visit(doc);
  return snippets;
};

export const collectWikiTitlesFromContent = (contentJson: string): string[] => {
  let doc: TipTapNode;
  try {
    doc = JSON.parse(contentJson) as TipTapNode;
  } catch {
    return [];
  }

  const titles: string[] = [];

  const visit = (node: TipTapNode): void => {
    if (node.type === "text") {
      for (const mark of node.marks ?? []) {
        if (mark.type === "wikiLink" && mark.attrs?.title?.trim()) {
          titles.push(mark.attrs.title.trim());
        }
      }
      titles.push(...extractAllWikiLinkTitles(node.text ?? ""));
      return;
    }
    for (const child of node.content ?? []) {
      visit(child);
    }
  };

  visit(doc);
  return titles;
};

export type RelatedTitleRank = {
  title: string;
  count: number;
};

export const rankRelatedByCoOccurrence = (options: {
  targetTitle: string;
  mentionTitlesByNote: string[][];
}): RelatedTitleRank[] => {
  const target = options.targetTitle.trim().toLowerCase();
  const counts = new Map<string, { title: string; count: number }>();

  for (const titles of options.mentionTitlesByNote) {
    const unique = new Map<string, string>();
    for (const title of titles) {
      const trimmed = title.trim();
      if (!trimmed) {
        continue;
      }
      unique.set(trimmed.toLowerCase(), trimmed);
    }
    unique.delete(target);
    for (const [key, title] of unique) {
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { title, count: 1 });
      }
    }
  }

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.title.localeCompare(right.title);
  });
};
