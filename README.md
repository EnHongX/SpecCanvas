# SpecCanvas

SpecCanvas 是一个本地 Markdown 设计文档管理工具，基于 Next.js + TypeScript + Tailwind CSS + SQLite(sql.js) 构建。

## 功能特性

- **文档导入**：支持粘贴 Markdown 内容，或上传 `.md` / `.markdown` 文件。
- **文档管理**：支持文档列表、详情、编辑、删除、按类型筛选和排序。
- **类型管理**：支持创建、编辑、删除文档类型，并用颜色区分类型。
- **Schema v0**：为每个文档维护一份结构化 Schema，包含名称、描述、颜色、字体、间距和待确认事项。
- **Markdown 提取**：支持从 Markdown 中提取 `Colors`、`Typography`、`Spacing`、`Unresolved/TODO` 段落，生成 Schema 草稿。
- **表单确认**：Schema 页默认使用表单编辑，JSON 编辑器保留为高级模式。
- **Schema 预览**：预览页只读取已保存的 Schema，不再直接猜测 Markdown 内容。

## 技术栈

- **框架**: Next.js 14 App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite via `sql.js`
- **运行时**: React 18

## 项目结构

```text
SpecCanvas/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── extract-schema/route.ts
│   │   │   │       └── schema/route.ts
│   │   │   └── types/
│   │   ├── documents/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── edit/page.tsx
│   │   │       ├── preview/page.tsx
│   │   │       └── schema/page.tsx
│   │   ├── types/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── database.ts
│       ├── schema-v0.ts
│       ├── types.ts
│       ├── design-preview/
│       └── models/
├── scripts/schema-v0-smoke-test.mjs
├── package.json
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18.17 或更高版本
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
npm run build
```

### 启动生产服务

```bash
npm run start
```

## 页面说明

### 首页 (`/`)

- 展示项目入口和最近文档。
- 提供新建文档、浏览文档入口。

### 文档列表页 (`/documents`)

- 展示文档标题、来源类型、文档类型、创建时间、更新时间。
- 支持按类型筛选，并按创建时间、更新时间或标题排序。
- 支持进入详情、预览、Schema 编辑和删除文档。

### 新建/导入页 (`/documents/new`)

- 支持粘贴 Markdown 内容。
- 支持上传 `.md` / `.markdown` 文件。
- 支持设置文档标题和文档类型。
- 上传文件时会从文件名自动带出标题。

### 文档详情页 (`/documents/[id]`)

- 展示标题、来源类型、创建时间、更新时间、文档 ID。
- 展示原始 Markdown 内容和内容统计。
- 提供编辑、Schema、预览入口。

### Schema 编辑页 (`/documents/[id]/schema`)

- 首次进入时会自动创建默认 Schema v0。
- 默认使用表单编辑：
  - 名称
  - 描述
  - 颜色列表
  - 字体列表
  - 间距列表
  - 待确认事项
- 支持点击“从 Markdown 重新提取”生成 Schema 草稿。
- 提取结果需要用户确认并保存，不会自动覆盖已保存 Schema。
- JSON 编辑器保留为高级模式。

### 预览页 (`/documents/[id]/preview`)

- 只读取已保存的 Schema 渲染预览。
- 不再直接解析原始 Markdown。
- 如果 Schema 缺少名称、描述、颜色或字体，会提示先去 Schema 页补充。

## Schema v0

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

Markdown 提取支持以下常见段落标题：

- `Colors` / `颜色`
- `Typography` / `字体`
- `Spacing` / `间距`
- `Unresolved` / `Pending` / `TODO` / `待确认` / `待办`

示例：

```markdown
# Landing Page

首页设计规范。

## Colors
primary: #2563eb
surface: #ffffff

## Typography
body: 16px / 1.5 / 400
heading: 32px / 1.2 / 700

## Spacing
md: 16px
lg: 24px

## Unresolved
- 移动端导航还没定
```

## API 接口

### GET `/api/documents`

获取文档列表，支持分页、类型筛选和排序。

查询参数：

- `limit`: 每页数量，默认 10，最大 100
- `offset`: 偏移量，默认 0
- `typeId`: 类型 ID，传 `null` 可筛选无类型文档
- `sortBy`: `created_at` / `updated_at` / `title`
- `sortOrder`: `asc` / `desc`

响应示例：

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "title": "示例文档",
        "source_type": "paste",
        "raw_markdown": "# 示例文档",
        "type_id": null,
        "created_at": "2024-01-01T12:00:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### POST `/api/documents`

创建新文档。

```json
{
  "title": "文档标题",
  "source_type": "paste",
  "raw_markdown": "# Markdown 内容",
  "type_id": null
}
```

### PUT `/api/documents/[id]`

更新文档信息。

```json
{
  "title": "新标题",
  "raw_markdown": "# 新内容",
  "type_id": 1
}
```

### POST `/api/documents/[id]/extract-schema`

从文档原始 Markdown 提取 Schema v0 草稿。该接口只返回提取结果，不会自动保存。

```json
{
  "success": true,
  "data": {
    "meta": {
      "name": "Landing Page",
      "description": "首页设计规范。",
      "keywords": []
    },
    "tokens": {
      "colors": {
        "primary": "#2563eb"
      },
      "typography": {
        "body": "16px / 1.5 / 400"
      },
      "spacing": {
        "md": "16px"
      }
    },
    "unresolved": ["移动端导航还没定"]
  }
}
```

### GET `/api/documents/[id]/schema`

获取文档 Schema。如果文档还没有 Schema，会创建并返回默认 Schema v0。

### PUT `/api/documents/[id]/schema`

保存完整 Schema v0。校验失败时会返回 `details`。

### POST `/api/documents/[id]/schema`

确保文档 Schema 存在。如果已存在则返回现有 Schema，否则创建默认 Schema v0。

## 数据库结构

### documents 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| title | TEXT | 文档标题 |
| source_type | TEXT | 来源类型：`file` 或 `paste` |
| raw_markdown | TEXT | 原始 Markdown 内容 |
| type_id | INTEGER | 关联的文档类型 ID，可为空 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### document_types 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 类型名称 |
| description | TEXT | 类型描述 |
| color | TEXT | 类型颜色 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### schemas 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| document_id | INTEGER | 关联的文档 ID，唯一 |
| meta | TEXT | Schema v0 的 meta JSON |
| tokens | TEXT | Schema v0 的 tokens JSON |
| unresolved | TEXT | 待确认事项 JSON 数组 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 数据库文件

数据库文件默认存储在项目根目录下的 `speccanvas.db` 文件中。

可以通过环境变量 `DB_PATH` 自定义数据库路径：

```bash
DB_PATH=/path/to/custom.db npm run dev
```

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
- 从 Markdown 提取颜色、字体、间距和待确认事项
- 保存提取出的 Schema
- 提交非法 Schema 时返回具体字段错误

## 注意事项

1. `speccanvas.db` 已添加到 `.gitignore`，不会提交到版本控制。
2. 项目使用 `sql.js`，运行时需要能加载对应的 WASM 文件。
3. 推荐使用 Node.js 18.17 或更高版本。

## License

MIT
