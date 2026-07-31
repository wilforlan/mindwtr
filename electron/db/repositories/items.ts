import type Database from "better-sqlite3";
import {
  NodeSchema,
  NoteSchema,
  type GraphNode,
  type ItemHub,
  type MentionBookmark,
  type Note,
  type NoteKind,
  type RelatedItem,
} from "../../../shared/types";
import {
  collectWikiTitlesFromContent,
  extractMentionSnippets,
  rankRelatedByCoOccurrence,
} from "../../../shared/wiki-link";

type NodeRow = {
  id: string;
  profile_id: string;
  title: string;
  note_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type NoteRow = {
  id: string;
  profile_id: string;
  kind: NoteKind;
  title: string;
  date: string | null;
  content_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const mapNode = (row: NodeRow): GraphNode =>
  NodeSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    noteId: row.note_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  });

const mapNote = (row: NoteRow): Note =>
  NoteSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    kind: row.kind,
    title: row.title,
    date: row.date,
    contentJson: row.content_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export const createItemRepository = (db: Database.Database) => {
  const findByTitle = (
    profileId: string,
    title: string
  ): GraphNode | null => {
    const row = db
      .prepare(
        `SELECT id, profile_id, title, note_id, created_at, deleted_at
         FROM nodes
         WHERE profile_id = ? AND lower(title) = lower(?) AND deleted_at IS NULL`
      )
      .get(profileId, title.trim()) as NodeRow | undefined;
    return row ? mapNode(row) : null;
  };

  const getById = (id: string): GraphNode | null => {
    const row = db
      .prepare(
        `SELECT id, profile_id, title, note_id, created_at, deleted_at
         FROM nodes WHERE id = ?`
      )
      .get(id) as NodeRow | undefined;
    return row ? mapNode(row) : null;
  };

  const listActiveNotes = (profileId: string): Note[] => {
    const rows = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes
         WHERE profile_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC`
      )
      .all(profileId) as NoteRow[];
    return rows.map(mapNote);
  };

  const getHub = (options: {
    profileId: string;
    title?: string;
    nodeId?: string;
  }): ItemHub => {
    const node = options.nodeId
      ? getById(options.nodeId)
      : options.title
        ? findByTitle(options.profileId, options.title)
        : null;

    if (!node || node.deletedAt || node.profileId !== options.profileId) {
      throw new Error("Item not found");
    }

    const candidateNotes = listActiveNotes(options.profileId);
    const mentions: MentionBookmark[] = [];
    const titlesByNote: string[][] = [];

    for (const note of candidateNotes) {
      const snippets = extractMentionSnippets({
        contentJson: note.contentJson,
        itemTitle: node.title,
      });
      if (snippets.length === 0) {
        continue;
      }
      titlesByNote.push(collectWikiTitlesFromContent(note.contentJson));
      for (const snippet of snippets) {
        mentions.push({
          noteId: note.id,
          noteTitle: note.title,
          noteKind: note.kind,
          noteDate: note.date,
          noteUpdatedAt: note.updatedAt,
          snippet,
        });
      }
    }

    mentions.sort((left, right) =>
      right.noteUpdatedAt.localeCompare(left.noteUpdatedAt)
    );

    const ranked = rankRelatedByCoOccurrence({
      targetTitle: node.title,
      mentionTitlesByNote: titlesByNote,
    });

    const related: RelatedItem[] = ranked.flatMap((entry) => {
      const relatedNode = findByTitle(options.profileId, entry.title);
      if (!relatedNode) {
        return [];
      }
      return [
        {
          node: relatedNode,
          coOccurrenceCount: entry.count,
        },
      ];
    });

    return { node, mentions, related };
  };

  return {
    findByTitle,
    getById,
    getHub,
  };
};

export type ItemRepository = ReturnType<typeof createItemRepository>;
