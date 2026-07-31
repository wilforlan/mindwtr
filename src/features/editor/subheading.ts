import { Node, mergeAttributes } from "@tiptap/core";

export const Subheading = Node.create({
  name: "subheading",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "h4" }, { tag: 'p[data-type="subheading"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "h4",
      mergeAttributes(HTMLAttributes, {
        "data-type": "subheading",
        class: "subheading",
      }),
      0,
    ];
  },
  addCommands() {
    return {
      setSubheading:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subheading: {
      setSubheading: () => ReturnType;
    };
  }
}
