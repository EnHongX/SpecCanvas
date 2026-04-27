# SpecCanvas

一个简单而强大的 Markdown 文档管理系统，基于 Next.js + TypeScript + Tailwind CSS + SQLite 构建。

## 功能特性

- **多种导入方式**：支持上传本地 Markdown 文件或直接粘贴 Markdown 内容
- **文档管理**：查看文档列表、文档详情，支持状态管理（草稿/已发布/已归档）
- **Schema v0 编辑**：为每个文档维护一份最小 Schema，支持首次自动创建、手动编辑和保存
- **本地存储**：使用 SQLite 本地数据库，所有数据保存在本地，安全可靠
- **现代化 UI**：基于 Tailwind CSS 构建的现代化界面，支持深色模式
- **内容统计**：自动统计文档字符数、行数等信息

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (sql.js)
- **其他**: React 18

## 项目结构

```
SpecCanvas/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── documents/          # API 路由
│   │   │       ├── route.ts        # 文档列表和创建
│   │   │       └── [id]/
│   │   │           ├── route.ts    # 单个文档操作
│   │   │           └── schema/
│   │   │               └── route.ts # 文档 Schema 操作
│   │   ├── documents/
│   │   │   ├── page.tsx            # 文档列表页
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # 新建/导入页
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 文档详情页
│   │   │       ├── edit/
│   │   │       │   └── page.tsx    # 文档编辑页
│   │   │       └── schema/
│   │   │           └── page.tsx    # Schema 编辑页
│   │   ├── globals.css             # 全局样式
│   │   ├── layout.tsx              # 根布局
│   │   └── page.tsx                # 首页
│   └── lib/
│       ├── database.ts             # 数据库连接和初始化
│       ├── schema-v0.ts            # Schema v0 默认结构和校验
│       ├── types.ts                # TypeScript 类型定义
│       └── models/
│           ├── document.ts         # 文档数据模型
│           └── schema.ts           # Schema 数据模型
├── scripts/
│   └── schema-v0-smoke-test.mjs    # Schema v0 回归测试
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.js
├── next-env.d.ts
├── .gitignore
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18.17 或更高版本
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

项目启动后，打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看应用。

### 生产构建

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

### 启动生产服务

```bash
npm run start
# 或
yarn start
# 或
pnpm start
```

## 页面说明

### 首页 (`/`)

- 项目介绍和功能展示
- 最近文档列表（最多显示 5 个）
- 快速入口按钮（新建文档、浏览文档）

### 文档列表页 (`/documents`)

- 显示所有文档的表格列表
- 展示文档标题、来源类型、状态、创建时间、更新时间
- 点击文档标题可进入详情页
- 提供新建文档按钮

### 新建/导入页 (`/documents/new`)

- 支持两种导入方式：
  1. **粘贴内容**：直接在文本框中粘贴 Markdown 内容
  2. **上传文件**：上传本地 .md 或 .markdown 格式的文件
- 可设置文档标题和状态（草稿/已发布/已归档）
- 上传文件时会自动从文件名提取标题（如果未手动输入）

### 文档详情页 (`/documents/[id]`)

- 显示文档完整信息：
  - 标题
  - 来源类型
  - 状态
  - 创建时间
  - 更新时间
  - 文档 ID
- 显示原始 Markdown 内容
- 内容统计信息（字符数、行数）
- 提供返回列表页、编辑页和 Schema 页入口

### Schema 编辑页 (`/documents/[id]/schema`)

- 任意已创建文档都可以进入 Schema 编辑页
- 首次进入时，如果文档还没有 Schema，会自动创建默认空结构
- 当前 Schema v0 只包含：
  - `meta.name`
  - `meta.description`
  - `meta.keywords`
  - `tokens.colors`
  - `tokens.typography`
  - `tokens.spacing`
  - `unresolved`
- 支持直接编辑 JSON 并保存
- 保存失败时会显示具体字段错误
- 当前版本不包含 Markdown 自动解析、可视化预览、主题切换或导出功能

## API 接口

### GET `/api/documents`

获取文档列表，支持分页。

**查询参数：**
- `limit`: 每页数量（默认 50）
- `offset`: 偏移量（默认 0）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "title": "示例文档",
        "source_type": "paste",
        "raw_markdown": "# 示例文档\n\n这是一个示例文档。",
        "status": "draft",
        "created_at": "2024-01-01T12:00:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "total": 10
  }
}
```

### POST `/api/documents`

创建新文档。

**请求体：**
```json
{
  "title": "文档标题",
  "source_type": "file" | "paste",
  "raw_markdown": "# Markdown 内容",
  "status": "draft" | "published" | "archived"  // 可选，默认 draft
}
```

### GET `/api/documents/[id]`

获取单个文档详情。

### PUT `/api/documents/[id]`

更新文档信息。

**请求体（所有字段可选）：**
```json
{
  "title": "新标题",
  "raw_markdown": "# 新内容",
  "status": "published"
}
```

### DELETE `/api/documents/[id]`

删除文档。

### GET `/api/documents/[id]/schema`

获取文档 Schema。如果该文档还没有 Schema，会创建并返回默认 Schema v0。

**默认响应中的 Schema 内容：**

```json
{
  "meta": {
    "name": "",
    "description": "",
    "keywords": []
  },
  "tokens": {
    "colors": {},
    "typography": {},
    "spacing": {}
  },
  "unresolved": []
}
```

### PUT `/api/documents/[id]/schema`

保存文档 Schema。请求体必须是完整 Schema v0 内容。

**请求体：**

```json
{
  "meta": {
    "name": "Landing Page",
    "description": "首页设计规范",
    "keywords": ["landing", "homepage"]
  },
  "tokens": {
    "colors": {
      "primary": "#111827"
    },
    "typography": {
      "body": "16px/1.5 sans-serif"
    },
    "spacing": {
      "md": "16px"
    }
  },
  "unresolved": ["确认移动端导航状态"]
}
```

校验失败时会返回 `details`，用于指出具体字段问题。

### POST `/api/documents/[id]/schema`

确保文档 Schema 存在。如果已存在则返回现有 Schema，否则创建默认 Schema v0。

## 数据库结构

### documents 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| title | TEXT | 文档标题 |
| source_type | TEXT | 来源类型：'file' 或 'paste' |
| raw_markdown | TEXT | 原始 Markdown 内容 |
| status | TEXT | 状态：'draft', 'published', 'archived'，默认 'draft' |
| created_at | DATETIME | 创建时间，默认当前时间 |
| updated_at | DATETIME | 更新时间，默认当前时间 |

### schemas 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| document_id | INTEGER | 关联的文档 ID，唯一 |
| meta | TEXT | Schema v0 的 meta JSON |
| tokens | TEXT | Schema v0 的 tokens JSON |
| unresolved | TEXT | 未解决项 JSON 数组 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 数据库文件

数据库文件默认存储在项目根目录下的 `speccanvas.db` 文件中。

可以通过环境变量 `DB_PATH` 自定义数据库路径：

```bash
DB_PATH=/path/to/custom.db npm run dev
```

## 注意事项

1. **数据库文件**：`speccanvas.db` 文件已添加到 `.gitignore`，不会被提交到版本控制。
2. **依赖安装**：`better-sqlite3` 是原生模块，安装时需要编译。如果遇到问题，请确保系统已安装 build tools。
3. **Node.js 版本**：推荐使用 Node.js 18.17 或更高版本。

## 开发说明

### 代码检查

```bash
npm run lint
```

### TypeScript 类型检查

```bash
npx tsc --noEmit
```

### Schema v0 回归测试

```bash
npm run test:schema
```

该脚本会使用临时数据库启动本地开发服务，覆盖：

- 创建文档
- 首次读取 Schema 并自动生成默认结构
- 手动保存 Schema
- 再次读取确认保存结果仍然存在
- 提交非法 Schema 时返回具体字段错误

## License

MIT
