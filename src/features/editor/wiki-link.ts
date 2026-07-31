import { InputRule, Mark, mergeAttributes } from "@tiptap/core";

export type WikiLinkAttributes = {
  title: string;
};

type WikiLinkOptions = {
  onResolved?: (title: string) => void;
};

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: "wikiLink",
  inclusive: false,
  excludes: "",

  addOptions() {
    return {
      onResolved: undefined,
    };
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-title") ?? element.textContent ?? "",
        renderHTML: (attributes: WikiLinkAttributes) => ({
          "data-title": attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-wiki-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": "true",
        class: "wiki-link",
        href: "#",
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const title = match[1]?.trim() ?? "";
          if (!title) {
            return null;
          }

          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText(title, start, end);
          tr.addMark(
            start,
            start + title.length,
            this.type.create({ title })
          );
          tr.removeStoredMark(this.type);
          this.options.onResolved?.(title);
          return;
        },
      }),
    ];
  },
});
