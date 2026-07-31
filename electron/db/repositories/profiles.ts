import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import { ProfileSchema, type Profile } from "../../../shared/types";

type ProfileRow = {
  id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
};

const mapProfile = (row: ProfileRow): Profile =>
  ProfileSchema.parse({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  });

export const createProfileRepository = (db: Database.Database) => {
  const listActive = (): Profile[] => {
    const rows = db
      .prepare(
        `SELECT id, name, created_at, deleted_at
         FROM profiles
         WHERE deleted_at IS NULL
         ORDER BY created_at ASC`
      )
      .all() as ProfileRow[];
    return rows.map(mapProfile);
  };

  const listArchived = (): Profile[] => {
    const rows = db
      .prepare(
        `SELECT id, name, created_at, deleted_at
         FROM profiles
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`
      )
      .all() as ProfileRow[];
    return rows.map(mapProfile);
  };

  const create = (name: string): Profile => {
    const profile: Profile = {
      id: uuid(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    db.prepare(
      `INSERT INTO profiles (id, name, created_at, deleted_at)
       VALUES (@id, @name, @createdAt, @deletedAt)`
    ).run(profile);
    return profile;
  };

  const softDelete = (id: string): Profile => {
    const deletedAt = new Date().toISOString();
    db.prepare(
      `UPDATE profiles SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`
    ).run(deletedAt, id);
    const row = db
      .prepare(
        `SELECT id, name, created_at, deleted_at FROM profiles WHERE id = ?`
      )
      .get(id) as ProfileRow | undefined;
    if (!row) {
      throw new Error(`Profile not found: ${id}`);
    }
    return mapProfile(row);
  };

  const restore = (id: string): Profile => {
    db.prepare(
      `UPDATE profiles SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL`
    ).run(id);
    const row = db
      .prepare(
        `SELECT id, name, created_at, deleted_at FROM profiles WHERE id = ?`
      )
      .get(id) as ProfileRow | undefined;
    if (!row) {
      throw new Error(`Profile not found: ${id}`);
    }
    return mapProfile(row);
  };

  return {
    listActive,
    listArchived,
    create,
    softDelete,
    restore,
  };
};

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
