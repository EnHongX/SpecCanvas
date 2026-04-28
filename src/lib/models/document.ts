import { getDb, saveDatabase } from '../database';
import { Document, CreateDocumentRequest, UpdateDocumentRequest } from '../types';

export const documentModel = {
  create: async (data: CreateDocumentRequest): Promise<Document> => {
    const db = await getDb();
    const typeId = data.type_id || null;
    const now = new Date().toISOString();
    
    db.run(`
      INSERT INTO documents (title, source_type, raw_markdown, type_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.title, data.source_type, data.raw_markdown, typeId, now, now]);
    
    const result = db.exec("SELECT last_insert_rowid() as id");
    const lastInsertId = result[0]?.values[0][0] as number;
    
    saveDatabase();
    
    const getResult = db.exec(`
      SELECT * FROM documents WHERE id = ?
    `, [lastInsertId]);
    
    const document = getResult[0]?.values[0];
    return {
      id: document[0] as number,
      title: document[1] as string,
      source_type: document[2] as 'file' | 'paste',
      raw_markdown: document[3] as string,
      type_id: document[4] as number | null,
      created_at: document[5] as string,
      updated_at: document[6] as string,
    };
  },

  getById: async (id: number): Promise<Document | null> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM documents WHERE id = ?
    `, [id]);
    
    if (!result[0] || result[0].values.length === 0) {
      return null;
    }
    
    const document = result[0].values[0];
    return {
      id: document[0] as number,
      title: document[1] as string,
      source_type: document[2] as 'file' | 'paste',
      raw_markdown: document[3] as string,
      type_id: document[4] as number | null,
      created_at: document[5] as string,
      updated_at: document[6] as string,
    };
  },

  getAll: async (limit: number = 50, offset: number = 0, options?: {
    typeId?: number | null;
    sortBy?: 'created_at' | 'updated_at' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Document[]> => {
    const db = await getDb();
    const { typeId, sortBy = 'created_at', sortOrder = 'desc' } = options || {};
    
    let query = `SELECT * FROM documents`;
    const conditions: string[] = [];
    const values: (number | string)[] = [];
    
    if (typeId !== undefined) {
      if (typeId === null) {
        conditions.push('type_id IS NULL');
      } else {
        conditions.push('type_id = ?');
        values.push(typeId);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const validSortFields = ['created_at', 'updated_at', 'title'];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const actualSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${actualSortBy} ${actualSortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    values.push(limit, offset);
    
    const result = db.exec(query, values);
    
    if (!result[0] || result[0].values.length === 0) {
      return [];
    }
    
    return result[0].values.map((document: unknown[]) => ({
      id: document[0] as number,
      title: document[1] as string,
      source_type: document[2] as 'file' | 'paste',
      raw_markdown: document[3] as string,
      type_id: document[4] as number | null,
      created_at: document[5] as string,
      updated_at: document[6] as string,
    }));
  },

  count: async (options?: { typeId?: number | null }): Promise<number> => {
    const db = await getDb();
    const { typeId } = options || {};
    
    let query = `SELECT COUNT(*) as count FROM documents`;
    const conditions: string[] = [];
    const values: (number | string)[] = [];
    
    if (typeId !== undefined) {
      if (typeId === null) {
        conditions.push('type_id IS NULL');
      } else {
        conditions.push('type_id = ?');
        values.push(typeId);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = db.exec(query, values);
    
    if (!result[0] || result[0].values.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  },

  update: async (id: number, data: UpdateDocumentRequest): Promise<Document | null> => {
    const existingDoc = await documentModel.getById(id);
    if (!existingDoc) {
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (data.raw_markdown !== undefined) {
      updates.push('raw_markdown = ?');
      values.push(data.raw_markdown);
    }

    if (data.type_id !== undefined) {
      updates.push('type_id = ?');
      values.push(data.type_id);
    }

    values.push(id);

    db.run(`
      UPDATE documents
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    saveDatabase();

    return await documentModel.getById(id);
  },

  // 删除文档
  delete: async (id: number): Promise<boolean> => {
    const db = await getDb();
    
    // 先检查文档是否存在
    const existingDoc = await documentModel.getById(id);
    if (!existingDoc) {
      return false;
    }
    
    db.run(`
      DELETE FROM documents WHERE id = ?
    `, [id]);
    
    // 保存数据库到文件
    saveDatabase();
    
    return true;
  }
};
