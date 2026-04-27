import { getDb, saveDatabase } from '../database';
import { Schema, SchemaMeta, SchemaTokens, CreateSchemaRequest, UpdateSchemaRequest } from '../types';

const getDefaultSchemaMeta = (): SchemaMeta => ({
  name: '',
  description: '',
  keywords: [],
});

const getDefaultSchemaTokens = (): SchemaTokens => ({
  colors: {},
  typography: {},
  spacing: {},
  radii: {},
  breakpoints: {},
  shadows: {},
  borders: {},
  opacity: {},
  zIndex: {},
});

export const schemaModel = {
  getDefaultEmptySchema: (documentId: number): Omit<Schema, 'id' | 'created_at' | 'updated_at'> => ({
    document_id: documentId,
    meta: getDefaultSchemaMeta(),
    tokens: getDefaultSchemaTokens(),
    unresolved: [],
  }),

  getByDocumentId: async (documentId: number): Promise<Schema | null> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM schemas WHERE document_id = ?
    `, [documentId]);
    
    if (!result[0] || result[0].values.length === 0) {
      return null;
    }
    
    const row = result[0].values[0];
    return {
      id: row[0] as number,
      document_id: row[1] as number,
      meta: JSON.parse(row[2] as string),
      tokens: JSON.parse(row[3] as string),
      unresolved: JSON.parse(row[4] as string),
      created_at: row[5] as string,
      updated_at: row[6] as string,
    };
  },

  getById: async (id: number): Promise<Schema | null> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM schemas WHERE id = ?
    `, [id]);
    
    if (!result[0] || result[0].values.length === 0) {
      return null;
    }
    
    const row = result[0].values[0];
    return {
      id: row[0] as number,
      document_id: row[1] as number,
      meta: JSON.parse(row[2] as string),
      tokens: JSON.parse(row[3] as string),
      unresolved: JSON.parse(row[4] as string),
      created_at: row[5] as string,
      updated_at: row[6] as string,
    };
  },

  create: async (data: CreateSchemaRequest): Promise<Schema> => {
    const db = await getDb();
    const now = new Date().toISOString();
    
    const meta = { ...getDefaultSchemaMeta(), ...data.meta };
    const tokens = { ...getDefaultSchemaTokens(), ...data.tokens };
    const unresolved = data.unresolved || [];
    
    db.run(`
      INSERT INTO schemas (document_id, meta, tokens, unresolved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.document_id,
      JSON.stringify(meta),
      JSON.stringify(tokens),
      JSON.stringify(unresolved),
      now,
      now,
    ]);
    
    saveDatabase();
    
    const result = db.exec("SELECT last_insert_rowid() as id");
    const lastInsertId = result[0]?.values[0][0] as number;
    
    const getResult = db.exec(`
      SELECT * FROM schemas WHERE id = ?
    `, [lastInsertId]);
    
    const row = getResult[0]?.values[0];
    return {
      id: row[0] as number,
      document_id: row[1] as number,
      meta: JSON.parse(row[2] as string),
      tokens: JSON.parse(row[3] as string),
      unresolved: JSON.parse(row[4] as string),
      created_at: row[5] as string,
      updated_at: row[6] as string,
    };
  },

  update: async (id: number, data: UpdateSchemaRequest): Promise<Schema | null> => {
    const existingSchema = await schemaModel.getById(id);
    if (!existingSchema) {
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const values: (string | number)[] = [now];

    if (data.meta !== undefined) {
      const mergedMeta = { ...existingSchema.meta, ...data.meta };
      updates.push('meta = ?');
      values.push(JSON.stringify(mergedMeta));
    }

    if (data.tokens !== undefined) {
      const mergedTokens = { ...existingSchema.tokens, ...data.tokens };
      updates.push('tokens = ?');
      values.push(JSON.stringify(mergedTokens));
    }

    if (data.unresolved !== undefined) {
      updates.push('unresolved = ?');
      values.push(JSON.stringify(data.unresolved));
    }

    values.push(id);

    db.run(`
      UPDATE schemas
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    saveDatabase();

    return await schemaModel.getById(id);
  },

  upsert: async (data: CreateSchemaRequest): Promise<Schema> => {
    const existingSchema = await schemaModel.getByDocumentId(data.document_id);
    
    if (existingSchema) {
      const updateData: UpdateSchemaRequest = {};
      if (data.meta) updateData.meta = data.meta;
      if (data.tokens) updateData.tokens = data.tokens;
      if (data.unresolved !== undefined) updateData.unresolved = data.unresolved;
      
      const updated = await schemaModel.update(existingSchema.id, updateData);
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
