import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'speccanvas.db');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库实例
let db: SqlJsDatabase | null = null;
let isInitialized = false;

// 保存数据库到文件
const saveDatabase = () => {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

// 初始化数据库
const initDatabase = async (): Promise<SqlJsDatabase> => {
  if (isInitialized && db) {
    return db;
  }

  // 加载 SQL.js
  const SQL = await initSqlJs();
  
  // 检查是否存在现有的数据库文件
  if (fs.existsSync(dbPath)) {
    // 从文件加载现有数据库
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('从现有文件加载数据库:', dbPath);
  } else {
    // 创建新数据库
    db = new SQL.Database();
    console.log('创建新数据库:', dbPath);
  }

  // 创建文档表（如果不存在）
  const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      raw_markdown TEXT NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;

  db.run(createDocumentsTable);

  // 为 created_at 和 updated_at 创建索引
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  `;

  db.run(createIndexes);
  
  // 保存数据库
  saveDatabase();
  
  isInitialized = true;
  console.log('数据库初始化完成');
  
  return db;
};

// 获取数据库实例
export const getDb = async (): Promise<SqlJsDatabase> => {
  if (!db || !isInitialized) {
    return await initDatabase();
  }
  return db;
};

// 保存数据库的辅助函数
export { saveDatabase };
