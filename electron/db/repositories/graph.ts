import type Database from "better-sqlite3";
import {
  LinkSchema,
  NodeSchema,
  type GraphData,
  type GraphLink,
  type GraphNode,
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

export const createGraphRepository = (db: Database.Database) => {
  const get = (profileId: string): GraphData => {
    const nodes = (
      db
        .prepare(
          `SELECT id, profile_id, title, note_id, created_at, deleted_at
           FROM nodes
           WHERE profile_id = ? AND deleted_at IS NULL
           ORDER BY created_at ASC`
        )
        .all(profileId) as NodeRow[]
    ).map(mapNode);

    const links = (
      db
        .prepare(
          `SELECT id, profile_id, source_note_id, target_node_id, label, created_at
           FROM links
           WHERE profile_id = ?
           ORDER BY created_at ASC`
        )
        .all(profileId) as LinkRow[]
    ).map(mapLink);

    return { nodes, links };
  };

  return { get };
};

export type GraphRepository = ReturnType<typeof createGraphRepository>;
