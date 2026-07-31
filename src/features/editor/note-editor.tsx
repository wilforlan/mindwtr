import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { format } from "date-fns";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { GraphNode, Note } from "@shared/types";
import { collectWikiTitlesFromContent } from "@shared/wiki-link";
import { Button } from "@/components/ui/button";
import { Subheading } from "./subheading";
import {
  WikiSuggestionMenu,
  type WikiSuggestionChoice,
} from "./wiki-suggestion-menu";
import { WikiLink } from "./wiki-link";

type NoteEditorProps = {
  note: Note;
  profileId: string;
  onChange: (contentJson: string) => Promise<void>;
  onWikiLink: (title: string) => Promise<GraphNode>;
  onOpenItem: (title: string) => void;
  onBackToNotes?: () => void;
};

export const NoteEditor = ({
  note,
  profileId,
  onChange,
  onWikiLink,
  onOpenItem,
  onBackToNotes,
}: NoteEditorProps): React.JSX.Element => {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef(note.id);
  const onWikiLinkRef = useRef(onWikiLink);
  const onOpenItemRef = useRef(onOpenItem);
  const syncedTitlesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onWikiLinkRef.current = onWikiLink;
  }, [onWikiLink]);

  useEffect(() => {
    onOpenItemRef.current = onOpenItem;
  }, [onOpenItem]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Subheading,
      WikiLink.configure({
        onResolved: (title) => {
          void onWikiLinkRef.current(title);
          syncedTitlesRef.current.add(title.toLowerCase());
        },
      }),
      Placeholder.configure({
        placeholder: "Write freely… Type [[idea]] to link as you go",
      }),
    ],
    content: JSON.parse(note.contentJson) as object,
    editorProps: {
      attributes: {
        class:
          "mindwtr-editor prose prose-stone max-w-none min-h-[70vh] focus:outline-none px-10 py-8 text-ink-900",
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return false;
        }
        const link = target.closest("a.wiki-link");
        if (!(link instanceof HTMLElement)) {
          return false;
        }
        event.preventDefault();
        const title = link.getAttribute("data-title")?.trim();
        if (title) {
          onOpenItemRef.current(title);
        }
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const json = JSON.stringify(current.getJSON());
      const titles = collectWikiTitlesFromContent(json);
      for (const title of titles) {
        const key = title.toLowerCase();
        if (!syncedTitlesRef.current.has(key)) {
          syncedTitlesRef.current.add(key);
          void onWikiLinkRef.current(title);
        }
      }

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        void onChange(json);
      }, 500);

      if (versionTimer.current) {
        clearTimeout(versionTimer.current);
      }
      versionTimer.current = setTimeout(() => {
        void window.mindwtr.history.saveVersion(noteIdRef.current);
      }, 30000);
    },
  });

  useEffect(() => {
    noteIdRef.current = note.id;
    syncedTitlesRef.current = new Set(
      collectWikiTitlesFromContent(note.contentJson).map((title) =>
        title.toLowerCase()
      )
    );
    if (!editor) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    if (current !== note.contentJson) {
      editor.commands.setContent(JSON.parse(note.contentJson) as object);
    }
  }, [editor, note.contentJson, note.id]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      if (versionTimer.current) {
        clearTimeout(versionTimer.current);
      }
    };
  }, []);

  const applySuggestion = useCallback(
    (choice: WikiSuggestionChoice) => {
      if (!editor) {
        return;
      }
      const markType = editor.schema.marks.wikiLink;
      if (!markType) {
        return;
      }
      const { title: linkTitle, from, to } = choice;
      const { tr } = editor.state;
      tr.insertText(linkTitle, from, to);
      tr.addMark(from, from + linkTitle.length, markType.create({ title: linkTitle }));
      editor.view.dispatch(tr);
      syncedTitlesRef.current.add(linkTitle.toLowerCase());
      void onWikiLinkRef.current(linkTitle);
      editor.commands.focus();
    },
    [editor]
  );

  const title =
    note.kind === "daily" && note.date
      ? format(new Date(`${note.date}T12:00:00`), "EEEE, MMMM d, yyyy")
      : note.title;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-sand-300/50 px-6 py-3">
        {onBackToNotes ? (
          <Button variant="ghost" size="sm" onClick={onBackToNotes}>
            Notes
          </Button>
        ) : null}
        <h2 className="font-[family-name:var(--font-display)] text-xl text-ink-900">
          {title}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            aria-label="Bullets"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            aria-label="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            aria-label="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().setSubheading().run()}
            aria-label="Subheading"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="relative flex-1 overflow-auto bg-gradient-to-b from-sand-50/40 to-transparent">
        <div className="mx-auto min-h-full max-w-3xl">
          <EditorContent editor={editor} />
        </div>
        <WikiSuggestionMenu
          editor={editor}
          profileId={profileId}
          onSelect={applySuggestion}
        />
      </div>
      <style>{`
        .mindwtr-editor h1 { font-family: var(--font-display); font-size: 2.25rem; margin: 1.2rem 0 0.6rem; }
        .mindwtr-editor h2 { font-family: var(--font-display); font-size: 1.75rem; margin: 1rem 0 0.5rem; }
        .mindwtr-editor h3 { font-family: var(--font-display); font-size: 1.35rem; margin: 0.9rem 0 0.4rem; }
        .mindwtr-editor .subheading { font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; color: #5c4338; margin: 0.7rem 0 0.35rem; }
        .mindwtr-editor p { line-height: 1.7; margin: 0.4rem 0; }
        .mindwtr-editor ul { list-style: disc; padding-left: 1.4rem; }
        .mindwtr-editor ol { list-style: decimal; padding-left: 1.4rem; }
        .mindwtr-editor a.wiki-link {
          color: #c97b3a;
          font-weight: 600;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .mindwtr-editor a.wiki-link:hover {
          color: #a8652e;
        }
        .mindwtr-editor p.is-editor-empty:first-child::before {
          color: rgb(61 47 40 / 0.35);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
