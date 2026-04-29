import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import net from 'node:net';

const TEST_TIMEOUT_MS = 45_000;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getAvailablePort = async () => {
  const server = net.createServer();

  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('无法获取可用端口'));
          return;
        }

        resolve(address.port);
      });
    });
  });
};

const waitForServer = async (baseUrl, getLogs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TEST_TIMEOUT_MS) {
    try {
      const response = await fetch(`${baseUrl}/api/documents?limit=1`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`等待开发服务启动超时。\n${getLogs()}`);
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new Error(`响应不是有效 JSON，HTTP ${response.status}`);
  }
};

const requestJson = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  return {
    response,
    body: await readJson(response),
  };
};

const run = async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'speccanvas-schema-'));
  const dbPath = join(tempDir, 'test.db');
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const logs = [];

  const server = spawn(
    'npm',
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        DB_PATH: dbPath,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const captureLog = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 40) logs.shift();
  };

  server.stdout.on('data', captureLog);
  server.stderr.on('data', captureLog);

  const getLogs = () => logs.join('').trim();

  const cleanup = () => {
    if (!server.killed) {
      if (process.platform === 'win32') {
        server.kill('SIGTERM');
      } else {
        try {
          process.kill(-server.pid, 'SIGTERM');
        } catch {
          server.kill('SIGTERM');
        }
      }
    }

    rmSync(tempDir, { recursive: true, force: true });
  };

  try {
    await waitForServer(baseUrl, getLogs);

    const created = await requestJson(baseUrl, '/api/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Schema v0 smoke test',
        source_type: 'paste',
        raw_markdown: '# Schema v0 smoke test\n\nThis document verifies schema persistence.',
      }),
    });

    assert(created.response.status === 201, `创建文档失败，HTTP ${created.response.status}`);
    assert(created.body.success && created.body.data?.id, '创建文档响应缺少 data.id');

    const documentId = created.body.data.id;
    const firstRead = await requestJson(baseUrl, `/api/documents/${documentId}/schema`);

    assert(firstRead.response.status === 200, `首次读取 Schema 失败，HTTP ${firstRead.response.status}`);
    assert(firstRead.body.success && firstRead.body.data, '首次读取 Schema 响应缺少 data');
    assert(firstRead.body.data.meta.name === '', '默认 meta.name 应为空字符串');
    assert(firstRead.body.data.meta.description === '', '默认 meta.description 应为空字符串');
    assert(Array.isArray(firstRead.body.data.meta.keywords), '默认 meta.keywords 应为数组');
    assert(typeof firstRead.body.data.tokens.colors === 'object', '默认 tokens.colors 缺失');
    assert(typeof firstRead.body.data.tokens.typography === 'object', '默认 tokens.typography 缺失');
    assert(typeof firstRead.body.data.tokens.spacing === 'object', '默认 tokens.spacing 缺失');
    assert(Array.isArray(firstRead.body.data.unresolved), '默认 unresolved 应为数组');

    const editedSchema = {
      meta: {
        name: 'Saved schema',
        description: 'Persisted by schema v0 smoke test',
        keywords: ['schema', 'v0'],
      },
      tokens: {
        colors: { primary: '#111827' },
        typography: { body: '16px/1.5 sans-serif' },
        spacing: { md: '16px' },
      },
      unresolved: ['confirm empty state copy'],
    };

    const saved = await requestJson(baseUrl, `/api/documents/${documentId}/schema`, {
      method: 'PUT',
      body: JSON.stringify(editedSchema),
    });

    assert(saved.response.status === 200, `保存 Schema 失败，HTTP ${saved.response.status}`);
    assert(saved.body.data?.meta?.name === editedSchema.meta.name, '保存后的 meta.name 不匹配');

    const secondRead = await requestJson(baseUrl, `/api/documents/${documentId}/schema`);

    assert(secondRead.response.status === 200, `再次读取 Schema 失败，HTTP ${secondRead.response.status}`);
    assert(secondRead.body.data.meta.name === editedSchema.meta.name, '再次读取未保留 meta.name');
    assert(secondRead.body.data.tokens.colors.primary === '#111827', '再次读取未保留 tokens.colors.primary');
    assert(secondRead.body.data.unresolved[0] === editedSchema.unresolved[0], '再次读取未保留 unresolved');

    const invalid = await requestJson(baseUrl, `/api/documents/${documentId}/schema`, {
      method: 'PUT',
      body: JSON.stringify({
        meta: { name: 1, description: '', keywords: [] },
        tokens: { colors: {}, typography: {}, radii: {} },
        unresolved: [1],
      }),
    });

    assert(invalid.response.status === 400, `非法 Schema 应返回 400，实际 HTTP ${invalid.response.status}`);
    assert(Array.isArray(invalid.body.details), '非法 Schema 响应缺少 details');
    assert(invalid.body.details.some((item) => item.includes('meta.name')), '缺少 meta.name 错误明细');
    assert(invalid.body.details.some((item) => item.includes('tokens.spacing')), '缺少 tokens.spacing 错误明细');
    assert(invalid.body.details.some((item) => item.includes('radii')), '缺少不支持 token 错误明细');
    assert(invalid.body.details.some((item) => item.includes('unresolved')), '缺少 unresolved 错误明细');

    const extractMarkdown = `# Extracted Design System

This document verifies Markdown to Schema extraction.

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
- 确认按钮 hover 状态
`;

    const extractDoc = await requestJson(baseUrl, '/api/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Markdown extraction smoke test',
        source_type: 'paste',
        raw_markdown: extractMarkdown,
      }),
    });

    assert(extractDoc.response.status === 201, `创建提取测试文档失败，HTTP ${extractDoc.response.status}`);
    assert(extractDoc.body.success && extractDoc.body.data?.id, '提取测试文档响应缺少 data.id');

    const extractDocumentId = extractDoc.body.data.id;
    const extracted = await requestJson(baseUrl, `/api/documents/${extractDocumentId}/extract-schema`, {
      method: 'POST',
    });

    assert(extracted.response.status === 200, `Markdown 提取失败，HTTP ${extracted.response.status}`);
    assert(extracted.body.success && extracted.body.data, 'Markdown 提取响应缺少 data');
    assert(extracted.body.data.meta.name === 'Extracted Design System', '未提取标题到 meta.name');
    assert(extracted.body.data.tokens.colors.primary === '#2563eb', '未提取 colors.primary');
    assert(extracted.body.data.tokens.typography.body === '16px / 1.5 / 400', '未提取 typography.body');
    assert(extracted.body.data.tokens.spacing.md === '16px', '未提取 spacing.md');
    assert(extracted.body.data.tokens.spacing.lg === '24px', '未提取 spacing.lg');
    assert(
      extracted.body.data.unresolved.includes('移动端导航还没定'),
      '未提取 unresolved 列表项'
    );

    const savedExtracted = await requestJson(baseUrl, `/api/documents/${extractDocumentId}/schema`, {
      method: 'PUT',
      body: JSON.stringify(extracted.body.data),
    });

    assert(savedExtracted.response.status === 200, `保存提取 Schema 失败，HTTP ${savedExtracted.response.status}`);
    assert(savedExtracted.body.data.tokens.spacing.md === '16px', '保存后 spacing.md 丢失');
    assert(
      savedExtracted.body.data.unresolved.includes('确认按钮 hover 状态'),
      '保存后 unresolved 列表项丢失'
    );

    console.log('Schema v0 smoke test passed');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    const output = getLogs();
    if (output) {
      console.error('\nDev server output:\n');
      console.error(output);
    }
    process.exitCode = 1;
  } finally {
    cleanup();
  }
};

await run();
