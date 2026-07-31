import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import {
  NoteSchema,
  NoteVersionSchema,
  type Note,
  type NoteVersion,
} from "../../../shared/types";

type VersionRow = {
  id: string;
  note_id: string;
  content_json: string;
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

const mapVersion = (row: VersionRow): NoteVersion =>
  NoteVersionSchema.parse({
    id: row.id,
    noteId: row.note_id,
    contentJson: row.content_json,
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

export const createHistoryRepository = (db: Database.Database) => {
  const listVersions = (noteId: string): NoteVersion[] => {
    const rows = db
      .prepare(
        `SELECT id, note_id, content_json, created_at
         FROM note_versions
         WHERE note_id = ?
         ORDER BY created_at DESC`
      )
      .all(noteId) as VersionRow[];
    return rows.map(mapVersion);
  };

  const saveVersion = (noteId: string): NoteVersion => {
    const note = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes WHERE id = ?`
      )
      .get(noteId) as NoteRow | undefined;
    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }
    const version: NoteVersion = {
      id: uuid(),
      noteId,
      contentJson: note.content_json,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO note_versions (id, note_id, content_json, created_at)
       VALUES (@id, @noteId, @contentJson, @createdAt)`
    ).run(version);
    return version;
  };

  const restoreVersion = (versionId: string): Note => {
    const version = db
      .prepare(
        `SELECT id, note_id, content_json, created_at
         FROM note_versions WHERE id = ?`
      )
      .get(versionId) as VersionRow | undefined;
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const current = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes WHERE id = ?`
      )
      .get(version.note_id) as NoteRow | undefined;
    if (!current) {
      throw new Error(`Note not found for version: ${versionId}`);
    }

    const snapshot: NoteVersion = {
      id: uuid(),
      noteId: current.id,
      contentJson: current.content_json,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO note_versions (id, note_id, content_json, created_at)
       VALUES (@id, @noteId, @contentJson, @createdAt)`
    ).run(snapshot);

    const updatedAt = new Date().toISOString();
    db.prepare(
      `UPDATE notes SET content_json = ?, updated_at = ? WHERE id = ?`
    ).run(version.content_json, updatedAt, current.id);

    const restored = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes WHERE id = ?`
      )
      .get(current.id) as NoteRow;
    return mapNote(restored);
  };

  return {
    listVersions,
    saveVersion,
    restoreVersion,
  };
};

export type HistoryRepository = ReturnType<typeof createHistoryRepository>;
