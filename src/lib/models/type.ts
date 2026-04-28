import { getDb, saveDatabase } from '../database';
import { DocumentType, CreateDocumentTypeRequest, UpdateDocumentTypeRequest } from '../types';

export const typeModel = {
  create: async (data: CreateDocumentTypeRequest): Promise<DocumentType> => {
    const db = await getDb();
    const now = new Date().toISOString();
    const color = data.color || '#3B82F6';
    const description = data.description || '';
    
    db.run(`
      INSERT INTO document_types (name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [data.name, description, color, now, now]);
    
    const result = db.exec("SELECT last_insert_rowid() as id");
    const lastInsertId = result[0]?.values[0][0] as number;
    
    saveDatabase();
    
    const getResult = db.exec(`
      SELECT * FROM document_types WHERE id = ?
    `, [lastInsertId]);
    
    const type = getResult[0]?.values[0];
    return {
      id: type[0] as number,
      name: type[1] as string,
      description: type[2] as string,
      color: type[3] as string,
      created_at: type[4] as string,
      updated_at: type[5] as string,
    };
  },

  getById: async (id: number): Promise<DocumentType | null> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM document_types WHERE id = ?
    `, [id]);
    
    if (!result[0] || result[0].values.length === 0) {
      return null;
    }
    
    const type = result[0].values[0];
    return {
      id: type[0] as number,
      name: type[1] as string,
      description: type[2] as string,
      color: type[3] as string,
      created_at: type[4] as string,
      updated_at: type[5] as string,
    };
  },

  getAll: async (): Promise<DocumentType[]> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT * FROM document_types
      ORDER BY created_at DESC
    `);
    
    if (!result[0] || result[0].values.length === 0) {
      return [];
    }
    
    return result[0].values.map((type: unknown[]) => ({
      id: type[0] as number,
      name: type[1] as string,
      description: type[2] as string,
      color: type[3] as string,
      created_at: type[4] as string,
      updated_at: type[5] as string,
    }));
  },

  count: async (): Promise<number> => {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT COUNT(*) as count FROM document_types
    `);
    
    if (!result[0] || result[0].values.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  },

  update: async (id: number, data: UpdateDocumentTypeRequest): Promise<DocumentType | null> => {
    const existingType = await typeModel.getById(id);
    if (!existingType) {
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const values: (string | number)[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    values.push(id);

    db.run(`
      UPDATE document_types
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    saveDatabase();

    return await typeModel.getById(id);
  },

  delete: async (id: number): Promise<boolean> => {
    const db = await getDb();
    
    const existingType = await typeModel.getById(id);
    if (!existingType) {
      return false;
    }
    
    const docsWithType = db.exec(`
      SELECT COUNT(*) as count FROM documents WHERE type_id = ?
    `, [id]);
    
    const count = docsWithType[0]?.values[0][0] as number;
    if (count > 0) {
      return false;
    }
    
    db.run(`
      DELETE FROM document_types WHERE id = ?
    `, [id]);
    
    saveDatabase();
    
    return true;
  }
};
