import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import {
  emptyDocJson,
  LinkSchema,
  NodeSchema,
  NoteSchema,
  type GraphLink,
  type GraphNode,
  type Note,
} from "../../../shared/types";

type NodeRow = {
  id: string;
  profile_id: string;
  title: string;
  note_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type LinkRow = {
  id: string;
  profile_id: string;
  source_note_id: string;
  target_node_id: string;
  label: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  profile_id: string;
  kind: "daily" | "freeform";
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

const mapLink = (row: LinkRow): GraphLink =>
  LinkSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    sourceNoteId: row.source_note_id,
    targetNodeId: row.target_node_id,
    label: row.label,
    createdAt: row.created_at,
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

export const createNodeRepository = (db: Database.Database) => {
  const getById = (id: string): GraphNode | null => {
    const row = db
      .prepare(
        `SELECT id, profile_id, title, note_id, created_at, deleted_at
         FROM nodes WHERE id = ?`
      )
      .get(id) as NodeRow | undefined;
    return row ? mapNode(row) : null;
  };

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

  const createFromWikiLink = (options: {
    profileId: string;
    sourceNoteId: string;
    title: string;
  }): { node: GraphNode; link: GraphLink } => {
    const title = options.title.trim();
    let node = findByTitle(options.profileId, title);
    if (!node) {
      const created: GraphNode = {
        id: uuid(),
        profileId: options.profileId,
        title,
        noteId: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      db.prepare(
        `INSERT INTO nodes (id, profile_id, title, note_id, created_at, deleted_at)
         VALUES (@id, @profileId, @title, @noteId, @createdAt, @deletedAt)`
      ).run(created);
      node = created;
    }

    const existingLink = db
      .prepare(
        `SELECT id, profile_id, source_note_id, target_node_id, label, created_at
         FROM links
         WHERE source_note_id = ? AND target_node_id = ?`
      )
      .get(options.sourceNoteId, node.id) as LinkRow | undefined;

    if (existingLink) {
      return { node, link: mapLink(existingLink) };
    }

    const link: GraphLink = {
      id: uuid(),
      profileId: options.profileId,
      sourceNoteId: options.sourceNoteId,
      targetNodeId: node.id,
      label: title,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO links
       (id, profile_id, source_note_id, target_node_id, label, created_at)
       VALUES (@id, @profileId, @sourceNoteId, @targetNodeId, @label, @createdAt)`
    ).run(link);
    return { node, link };
  };

  const promote = (nodeId: string): { node: GraphNode; note: Note } => {
    const node = getById(nodeId);
    if (!node || node.deletedAt) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    if (node.noteId) {
      const existing = db
        .prepare(
          `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
           FROM notes WHERE id = ?`
        )
        .get(node.noteId) as NoteRow | undefined;
      if (!existing) {
        throw new Error(`Linked note missing for node: ${nodeId}`);
      }
      return { node, note: mapNote(existing) };
    }

    const now = new Date().toISOString();
    const note: Note = {
      id: uuid(),
      profileId: node.profileId,
      kind: "freeform",
      title: node.title,
      date: null,
      contentJson: emptyDocJson,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    db.prepare(
      `INSERT INTO notes
       (id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at)
       VALUES (@id, @profileId, @kind, @title, @date, @contentJson, @createdAt, @updatedAt, @deletedAt)`
    ).run(note);
    db.prepare(`UPDATE nodes SET note_id = ? WHERE id = ?`).run(note.id, nodeId);
    const updated = getById(nodeId);
    if (!updated) {
      throw new Error(`Node disappeared after promote: ${nodeId}`);
    }
    return { node: updated, note };
  };

  const search = (options: {
    profileId: string;
    query: string;
    limit?: number;
  }): GraphNode[] => {
    const limit = options.limit ?? 8;
    const query = options.query.trim();

    if (!query) {
      const rows = db
        .prepare(
          `SELECT id, profile_id, title, note_id, created_at, deleted_at
           FROM nodes
           WHERE profile_id = ? AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .all(options.profileId, limit) as NodeRow[];
      return rows.map(mapNode);
    }

    const rows = db
      .prepare(
        `SELECT id, profile_id, title, note_id, created_at, deleted_at
         FROM nodes
         WHERE profile_id = ?
           AND deleted_at IS NULL
           AND lower(title) LIKE '%' || lower(?) || '%'
         ORDER BY
           CASE WHEN lower(title) LIKE lower(?) || '%' THEN 0 ELSE 1 END,
           title COLLATE NOCASE ASC
         LIMIT ?`
      )
      .all(options.profileId, query, query, limit) as NodeRow[];
    return rows.map(mapNode);
  };

  return {
    getById,
    createFromWikiLink,
    promote,
    search,
  };
};

export type NodeRepository = ReturnType<typeof createNodeRepository>;
