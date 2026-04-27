import { getDb, saveDatabase } from '../database';
import { Document, CreateDocumentRequest, UpdateDocumentRequest } from '../types';

export const documentModel = {
  // 创建新文档
  create: async (data: CreateDocumentRequest): Promise<Document> => {
    const db = await getDb();
    const status = data.status || 'draft';
    const now = new Date().toISOString();
    
    // 插入文档
    db.run(`
      INSERT INTO documents (title, source_type, raw_markdown, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.title, data.source_type, data.raw_markdown, status, now, now]);
    
    // 获取刚创建的文档 ID
    const result = db.exec("SELECT last_insert_rowid() as id");
    const lastInsertId = result[0]?.values[0][0] as number;
    
    // 保存数据库到文件
    saveDatabase();
    
    // 获取刚创建的文档
    const getResult = db.exec(`
      SELECT * FROM documents WHERE id = ?
    `, [lastInsertId]);
    
    const document = getResult[0]?.values[0];
    return {
      id: document[0] as number,
      title: document[1] as string,
      source_type: document[2] as 'file' | 'paste',
      raw_markdown: document[3] as string,
      status: document[4] as 'draft' | 'published' | 'archived',
      created_at: document[5] as string,
      updated_at: document[6] as string,
    };
  },

  // 根据 ID 获取文档
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
      status: document[4] as 'draft' | 'published' | 'archived',
      created_at: document[5] as string,
      updated_at: document[6] as string,
    };
  },

  // 获取所有文档（分页）
  getAll: async (limit: number = 50, offset: number = 0): Promise<Document[]> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM documents
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    if (!result[0] || result[0].values.length === 0) {
      return [];
    }
    
    return result[0].values.map(document => ({
      id: document[0] as number,
      title: document[1] as string,
      source_type: document[2] as 'file' | 'paste',
      raw_markdown: document[3] as string,
      status: document[4] as 'draft' | 'published' | 'archived',
      created_at: document[5] as string,
      updated_at: document[6] as string,
    }));
  },

  // 获取文档总数
  count: async (): Promise<number> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT COUNT(*) as count FROM documents
    `);
    
    if (!result[0] || result[0].values.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  },

  // 更新文档
  update: async (id: number, data: UpdateDocumentRequest): Promise<Document | null> => {
    // 检查文档是否存在
    const existingDoc = await documentModel.getById(id);
    if (!existingDoc) {
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // 构建更新语句
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number)[] = [now];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (data.raw_markdown !== undefined) {
      updates.push('raw_markdown = ?');
      values.push(data.raw_markdown);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    values.push(id);

    db.run(`
      UPDATE documents
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    // 保存数据库到文件
    saveDatabase();

    // 返回更新后的文档
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
