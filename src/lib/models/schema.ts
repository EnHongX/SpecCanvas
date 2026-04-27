import { getDb, saveDatabase } from '../database';
import {
  getDefaultSchemaContent,
  normalizeSchemaContent,
} from '../schema-v0';
import type {
  CreateSchemaRequest,
  Schema,
  SchemaContent,
  UpdateSchemaRequest,
} from '../types';

type SchemaRow = unknown[];

export class SchemaDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaDataError';
  }
}

const parseJsonColumn = (value: unknown, columnName: string): unknown => {
  if (typeof value !== 'string') {
    throw new SchemaDataError(`Schema ${columnName} 字段不是字符串`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new SchemaDataError(`Schema ${columnName} 字段不是有效 JSON`);
  }
};

const hydrateSchema = (row: SchemaRow): Schema => {
  const content = normalizeSchemaContent({
    meta: parseJsonColumn(row[2], 'meta'),
    tokens: parseJsonColumn(row[3], 'tokens'),
    unresolved: parseJsonColumn(row[4], 'unresolved'),
  });

  return {
    id: row[0] as number,
    document_id: row[1] as number,
    meta: content.meta,
    tokens: content.tokens,
    unresolved: content.unresolved,
    created_at: row[5] as string,
    updated_at: row[6] as string,
  };
};

const buildSchemaContent = (data: CreateSchemaRequest): SchemaContent => {
  return normalizeSchemaContent({
    meta: {
      ...getDefaultSchemaContent().meta,
      ...data.meta,
    },
    tokens: {
      ...getDefaultSchemaContent().tokens,
      ...data.tokens,
    },
    unresolved: data.unresolved,
  });
};

export const schemaModel = {
  getDefaultEmptySchema: (documentId: number): Omit<Schema, 'id' | 'created_at' | 'updated_at'> => ({
    document_id: documentId,
    ...getDefaultSchemaContent(),
  }),

  getByDocumentId: async (documentId: number): Promise<Schema | null> => {
    const db = await getDb();

    const result = db.exec(`
      SELECT * FROM schemas WHERE document_id = ?
    `, [documentId]);

    if (!result[0] || result[0].values.length === 0) {
      return null;
    }

    return hydrateSchema(result[0].values[0]);
  },

  getById: async (id: number): Promise<Schema | null> => {
    const db = await getDb();

    const result = db.exec(`
      SELECT * FROM schemas WHERE id = ?
    `, [id]);

    if (!result[0] || result[0].values.length === 0) {
      return null;
    }

    return hydrateSchema(result[0].values[0]);
  },

  create: async (data: CreateSchemaRequest): Promise<Schema> => {
    const db = await getDb();
    const now = new Date().toISOString();
    const content = buildSchemaContent(data);

    db.run(`
      INSERT INTO schemas (document_id, meta, tokens, unresolved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.document_id,
      JSON.stringify(content.meta),
      JSON.stringify(content.tokens),
      JSON.stringify(content.unresolved),
      now,
      now,
    ]);

    saveDatabase();

    const created = await schemaModel.getByDocumentId(data.document_id);
    if (!created) {
      throw new Error('Schema 创建后读取失败');
    }

    return created;
  },

  update: async (id: number, data: UpdateSchemaRequest): Promise<Schema | null> => {
    const existingSchema = await schemaModel.getById(id);
    if (!existingSchema) {
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const content = normalizeSchemaContent(data);

    db.run(`
      UPDATE schemas
      SET meta = ?, tokens = ?, unresolved = ?, updated_at = ?
      WHERE id = ?
    `, [
      JSON.stringify(content.meta),
      JSON.stringify(content.tokens),
      JSON.stringify(content.unresolved),
      now,
      id,
    ]);

    saveDatabase();

    return await schemaModel.getById(id);
  },

  upsert: async (data: CreateSchemaRequest): Promise<Schema> => {
    const existingSchema = await schemaModel.getByDocumentId(data.document_id);
    const content = buildSchemaContent(data);

    if (existingSchema) {
      const updated = await schemaModel.update(existingSchema.id, content);
      if (updated) return updated;
    }

    return await schemaModel.create(data);
  },

  delete: async (id: number): Promise<boolean> => {
    const db = await getDb();

    const existingSchema = await schemaModel.getById(id);
    if (!existingSchema) {
      return false;
    }

    db.run(`
      DELETE FROM schemas WHERE id = ?
    `, [id]);

    saveDatabase();

    return true;
  },

  deleteByDocumentId: async (documentId: number): Promise<boolean> => {
    const db = await getDb();

    const existingSchema = await schemaModel.getByDocumentId(documentId);
    if (!existingSchema) {
      return false;
    }

    db.run(`
      DELETE FROM schemas WHERE document_id = ?
    `, [documentId]);

    saveDatabase();

    return true;
  },
};
