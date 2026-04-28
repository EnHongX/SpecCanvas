import type { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'speccanvas.db');

// 确保数据库目录存在
const ensureDbDirExists = () => {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
};

let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;
let isInitialized = false;

// 保存数据库到文件
const saveDatabase = () => {
  if (!db) return;
  ensureDbDirExists();
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

// 动态加载 SQL.js
const loadSqlJs = async () => {
  try {
    // 在 Node.js 环境中，尝试使用 require 来加载 sql.js
    // 这样 sql.js 可以自动找到 WASM 文件
    console.log('尝试加载 SQL.js...');
    
    // 动态导入 sql.js 模块
    const sqlJsModule = await import('sql.js');
    
    // 尝试使用 sql.js 自带的 Node.js 兼容模式
    // 不指定 WASM 路径，让 sql.js 自己处理
    console.log('使用 SQL.js 自动加载 WASM...');
    const SQL = await sqlJsModule.default();
    
    console.log('SQL.js 加载成功');
    return SQL;
  } catch (error) {
    console.error('自动加载 SQL.js 失败，尝试手动加载:', error);
    
    // 如果自动加载失败，尝试手动加载 WASM 文件
    const sqlJsModule = await import('sql.js');
    
    // 尝试从多个位置加载 WASM 文件
    const possibleWasmPaths = [
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      '/node_modules/sql.js/dist/sql-wasm.wasm',
    ];
    
    let wasmBinary: Buffer | undefined;
    
    for (const wasmPath of possibleWasmPaths) {
      if (fs.existsSync(wasmPath)) {
        try {
          wasmBinary = fs.readFileSync(wasmPath);
          console.log('从路径加载 WASM 文件:', wasmPath);
          break;
        } catch (err) {
          console.warn('无法从路径加载 WASM 文件:', wasmPath, err);
        }
      }
    }
    
    // 初始化 SQL.js
    if (wasmBinary) {
      return await sqlJsModule.default({ wasmBinary });
    } else {
      // 如果没有找到 WASM 文件，抛出错误
      throw new Error('无法加载 SQL.js 的 WASM 文件');
    }
  }
};

const ensureTablesExist = (database: SqlJsDatabase) => {
  const createDocumentTypesTable = `
    CREATE TABLE IF NOT EXISTS document_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '' NOT NULL,
      color TEXT DEFAULT '#3B82F6' NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;

  database.run(createDocumentTypesTable);

  const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      raw_markdown TEXT NOT NULL,
      type_id INTEGER NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (type_id) REFERENCES document_types(id) ON DELETE SET NULL
    );
  `;

  database.run(createDocumentsTable);

  const createSchemasTable = `
    CREATE TABLE IF NOT EXISTS schemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      meta TEXT NOT NULL,
      tokens TEXT NOT NULL,
      unresolved TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      UNIQUE(document_id)
    );
  `;

  database.run(createSchemasTable);

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
    CREATE INDEX IF NOT EXISTS idx_documents_type_id ON documents(type_id);
    CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
  `;

  database.run(createIndexes);
};

const initDatabase = async (): Promise<SqlJsDatabase> => {
  try {
    ensureDbDirExists();
    
    console.log('正在初始化数据库...');
    
    const SQL = await loadSqlJs();
    console.log('SQL.js 加载成功');
    
    if (fs.existsSync(dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('从现有文件加载数据库:', dbPath);
      } catch (err) {
        console.warn('无法从现有文件加载数据库，创建新数据库:', err);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
      console.log('创建新数据库:', dbPath);
    }

    ensureTablesExist(db);
    saveDatabase();
    
    isInitialized = true;
    console.log('数据库初始化完成');
    
    return db;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

export const getDb = async (): Promise<SqlJsDatabase> => {
  if (initPromise) {
    return initPromise;
  }

  if (db && isInitialized) {
    ensureTablesExist(db);
    return db;
  }

  initPromise = initDatabase();
  
  try {
    const result = await initPromise;
    return result;
  } finally {
    initPromise = null;
  }
};

// 保存数据库的辅助函数
export { saveDatabase };
