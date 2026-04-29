'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { validateSchemaContent } from '@/lib/schema-v0';
import type { ApiResponse, Document, Schema, SchemaContent, SchemaMeta, SchemaTokens } from '@/lib/types';

interface TokenEntry {
  id: string;
  key: string;
  value: string;
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const toTokenEntries = (record: Record<string, string>): TokenEntry[] => {
  return Object.entries(record).map(([key, value]) => ({
    id: generateId(),
    key,
    value,
  }));
};

const toTokenRecord = (entries: TokenEntry[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key.trim() && entry.value.trim()) {
      result[entry.key.trim()] = entry.value.trim();
    }
  }
  return result;
};

const toEditableSchema = (schema: Schema): SchemaContent => ({
  meta: schema.meta,
  tokens: schema.tokens,
  unresolved: schema.unresolved,
});

const formatSchema = (schema: SchemaContent): string => {
  return JSON.stringify(schema, null, 2);
};

const readResponseJson = async <T,>(response: Response): Promise<ApiResponse<T>> => {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: `服务返回了不可解析的响应，HTTP ${response.status}`,
      errorType: 'server_error',
    };
  }
};

const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.trim());
};

interface FormState {
  meta: SchemaMeta;
  colors: TokenEntry[];
  typography: TokenEntry[];
  spacing: TokenEntry[];
  unresolved: string[];
}

const emptyTokenEntry = (): TokenEntry => ({
  id: generateId(),
  key: '',
  value: '',
});

export default function SchemaPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = useMemo(() => Number.parseInt(params.id as string, 10), [params.id]);

  const [schema, setSchema] = useState<Schema | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState('');

  const [formState, setFormState] = useState<FormState>({
    meta: { name: '', description: '', keywords: [] },
    colors: [],
    typography: [],
    spacing: [],
    unresolved: [],
  });

  const [showExtractConfirm, setShowExtractConfirm] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<FormState | null>(null);

  const initializeFromSchema = useCallback((schemaData: Schema) => {
    setSchema(schemaData);
    setFormState({
      meta: { ...schemaData.meta },
      colors: toTokenEntries(schemaData.tokens.colors),
      typography: toTokenEntries(schemaData.tokens.typography),
      spacing: toTokenEntries(schemaData.tokens.spacing),
      unresolved: [...schemaData.unresolved],
    });
    setJsonEditorValue(formatSchema(toEditableSchema(schemaData)));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (Number.isNaN(documentId)) {
        setErrors(['无效的文档 ID']);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrors([]);
      setSuccessMessage(null);

      try {
        const documentResponse = await fetch(`/api/documents/${documentId}`);
        const documentData = await readResponseJson<Document>(documentResponse);

        if (!documentResponse.ok || !documentData.success || !documentData.data) {
          setErrors([documentData.error || '获取文档失败']);
          setIsLoading(false);
          return;
        }

        const schemaResponse = await fetch(`/api/documents/${documentId}/schema`);
        const schemaData = await readResponseJson<Schema>(schemaResponse);

        if (!schemaResponse.ok || !schemaData.success || !schemaData.data) {
          setErrors([
            schemaData.error || '获取 Schema 失败',
            ...(schemaData.details || []),
          ]);
          setIsLoading(false);
          return;
        }

        setDocument(documentData.data);
        initializeFromSchema(schemaData.data);
      } catch {
        setErrors(['获取数据失败，请检查服务是否可用后重试']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [documentId, initializeFromSchema]);

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    setErrors([]);
    setSuccessMessage(null);
  };

  const updateMeta = (field: keyof SchemaMeta, value: string | string[]) => {
    updateFormState({
      meta: { ...formState.meta, [field]: value },
    });
  };

  const addTokenEntry = (field: 'colors' | 'typography' | 'spacing') => {
    updateFormState({
      [field]: [...formState[field], emptyTokenEntry()],
    });
  };

  const updateTokenEntry = (field: 'colors' | 'typography' | 'spacing', id: string, key: string, value: string) => {
    updateFormState({
      [field]: formState[field].map((entry) =>
        entry.id === id ? { ...entry, key, value } : entry
      ),
    });
  };

  const removeTokenEntry = (field: 'colors' | 'typography' | 'spacing', id: string) => {
    updateFormState({
      [field]: formState[field].filter((entry) => entry.id !== id),
    });
  };

  const addUnresolved = () => {
    updateFormState({
      unresolved: [...formState.unresolved, ''],
    });
  };

  const updateUnresolved = (index: number, value: string) => {
    const newUnresolved = [...formState.unresolved];
    newUnresolved[index] = value;
    updateFormState({ unresolved: newUnresolved });
  };

  const removeUnresolved = (index: number) => {
    updateFormState({
      unresolved: formState.unresolved.filter((_, i) => i !== index),
    });
  };

  const buildSchemaContent = (): SchemaContent => {
    if (isAdvancedMode) {
      try {
        const parsed = JSON.parse(jsonEditorValue);
        const validation = validateSchemaContent(parsed);
        if (validation.ok) {
          return validation.value;
        }
      } catch {
        // Fall through to default
      }
    }

    return {
      meta: {
        name: formState.meta.name.trim(),
        description: formState.meta.description.trim(),
        keywords: formState.meta.keywords.filter((k) => k.trim()),
      },
      tokens: {
        colors: toTokenRecord(formState.colors),
        typography: toTokenRecord(formState.typography),
        spacing: toTokenRecord(formState.spacing),
      },
      unresolved: formState.unresolved.filter((u) => u.trim()),
    };
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccessMessage(null);

    let content: SchemaContent;

    if (isAdvancedMode) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonEditorValue);
      } catch (error) {
        setErrors([
          error instanceof Error
            ? `JSON 格式错误：${error.message}`
            : 'JSON 格式错误，无法解析',
        ]);
        return;
      }

      const validation = validateSchemaContent(parsed);
      if (!validation.ok) {
        setErrors(validation.errors);
        return;
      }

      content = validation.value;
    } else {
      content = buildSchemaContent();
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/schema`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      });

      const data = await readResponseJson<Schema>(response);

      if (!response.ok || !data.success || !data.data) {
        setErrors([
          data.error || `保存失败，HTTP ${response.status}`,
          ...(data.details || []),
        ]);
        return;
      }

      initializeFromSchema(data.data);
      setSuccessMessage('Schema 已保存');
    } catch {
      setErrors(['保存失败，请检查网络或服务状态后重试']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtractFromMarkdown = async () => {
    setIsExtracting(true);
    setErrors([]);
    setShowExtractConfirm(false);

    try {
      const response = await fetch(`/api/documents/${documentId}/extract-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await readResponseJson<SchemaContent>(response);

      if (!response.ok || !data.success || !data.data) {
        setErrors([
          data.error || `提取失败，HTTP ${response.status}`,
          ...(data.details || []),
        ]);
        return;
      }

      const extracted = data.data;
      const newFormState: FormState = {
        meta: { ...extracted.meta },
        colors: toTokenEntries(extracted.tokens.colors),
        typography: toTokenEntries(extracted.tokens.typography),
        spacing: toTokenEntries(extracted.tokens.spacing),
        unresolved: [...extracted.unresolved],
      };

      setExtractedPreview(newFormState);
      setShowExtractConfirm(true);
    } catch {
      setErrors(['从 Markdown 提取 Schema 失败，请检查服务状态后重试']);
    } finally {
      setIsExtracting(false);
    }
  };

  const confirmExtract = () => {
    if (extractedPreview) {
      updateFormState(extractedPreview);
      setJsonEditorValue(formatSchema({
        meta: extractedPreview.meta,
        tokens: {
          colors: toTokenRecord(extractedPreview.colors),
          typography: toTokenRecord(extractedPreview.typography),
          spacing: toTokenRecord(extractedPreview.spacing),
        },
        unresolved: extractedPreview.unresolved,
      }));
      setSuccessMessage('已从 Markdown 提取 Schema，请保存以确认更改');
    }
    setShowExtractConfirm(false);
    setExtractedPreview(null);
  };

  const toggleAdvancedMode = () => {
    if (isAdvancedMode) {
      try {
        const parsed = JSON.parse(jsonEditorValue);
        const validation = validateSchemaContent(parsed);
        if (validation.ok) {
          setFormState({
            meta: { ...validation.value.meta },
            colors: toTokenEntries(validation.value.tokens.colors),
            typography: toTokenEntries(validation.value.tokens.typography),
            spacing: toTokenEntries(validation.value.tokens.spacing),
            unresolved: [...validation.value.unresolved],
          });
        }
      } catch {
        // Keep current form state if JSON is invalid
      }
    } else {
      setJsonEditorValue(formatSchema(buildSchemaContent()));
    }
    setIsAdvancedMode(!isAdvancedMode);
    setErrors([]);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-16 text-gray-600 dark:text-gray-400">
          加载中...
        </div>
      </div>
    );
  }

  if (!schema || !document) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Schema 加载失败
          </h1>
          {errors.length > 0 && (
            <ul className="space-y-2 mb-6 text-red-700 dark:text-red-300">
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          )}
          <Link
            href="/documents"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            返回文档列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回文档
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExtractFromMarkdown}
            disabled={isExtracting}
            className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isExtracting ? '提取中...' : '从 Markdown 重新提取'}
          </button>
          <button
            type="button"
            onClick={toggleAdvancedMode}
            className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {isAdvancedMode ? '切换到表单模式' : '切换到 JSON 模式'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存 Schema'}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-300 mb-2">保存前请处理这些问题：</p>
          <ul className="space-y-1 text-red-700 dark:text-red-300">
            {errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Schema: {document.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>文档 ID: {schema.document_id}</span>
              <span>Schema ID: {schema.id}</span>
              <span>更新于: {new Date(schema.updated_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>

      {showExtractConfirm && extractedPreview && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start mb-4">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-1">
                已从 Markdown 提取新的 Schema
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                以下是提取结果预览。确认后将替换当前表单内容，然后需要点击「保存」按钮才能永久保存。
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">设计系统名称：</span>
              <span className="font-medium text-gray-900 dark:text-white">{extractedPreview.meta.name || '(空)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">颜色数量：</span>
              <span className="font-medium text-gray-900 dark:text-white">{Object.keys(toTokenRecord(extractedPreview.colors)).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">字体数量：</span>
              <span className="font-medium text-gray-900 dark:text-white">{Object.keys(toTokenRecord(extractedPreview.typography)).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">间距数量：</span>
              <span className="font-medium text-gray-900 dark:text-white">{Object.keys(toTokenRecord(extractedPreview.spacing)).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">待确认事项：</span>
              <span className="font-medium text-gray-900 dark:text-white">{extractedPreview.unresolved.filter(u => u.trim()).length}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmExtract}
              className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
            >
              确认使用提取结果
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExtractConfirm(false);
                setExtractedPreview(null);
              }}
              className="inline-flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {isAdvancedMode ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              JSON 编辑器（高级模式）
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              直接编辑 Schema 的 JSON 结构。请确保格式正确。
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={jsonEditorValue}
              onChange={(event) => {
                setJsonEditorValue(event.target.value);
                if (errors.length > 0) setErrors([]);
                if (successMessage) setSuccessMessage(null);
              }}
              spellCheck={false}
              className="w-full min-h-[520px] resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 font-mono text-sm leading-6 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              基本信息
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="schema-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  设计系统名称 <span className="text-red-500">*</span>
                </label>
                <input
                  id="schema-name"
                  type="text"
                  value={formState.meta.name}
                  onChange={(e) => updateMeta('name', e.target.value)}
                  placeholder="例如：Apple Design System"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="schema-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  设计系统描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="schema-description"
                  value={formState.meta.description}
                  onChange={(e) => updateMeta('description', e.target.value)}
                  placeholder="描述这个设计系统的用途和特点..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 resize-y"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                颜色列表 <span className="text-red-500">*</span>
              </h2>
              <button
                type="button"
                onClick={() => addTokenEntry('colors')}
                className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加颜色
              </button>
            </div>
            <div className="space-y-3">
              {formState.colors.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                  暂无颜色定义，点击上方按钮添加
                </p>
              ) : (
                formState.colors.map((color, index) => (
                  <div key={color.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 flex-shrink-0" style={{ backgroundColor: isValidHexColor(color.value) ? color.value : '#e5e7eb' }} />
                    <input
                      type="text"
                      value={color.key}
                      onChange={(e) => updateTokenEntry('colors', color.id, e.target.value, color.value)}
                      placeholder="名称（如 primary）"
                      className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={color.value}
                      onChange={(e) => updateTokenEntry('colors', color.id, color.key, e.target.value)}
                      placeholder="#RRGGBB"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeTokenEntry('colors', color.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="删除"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                字体列表 <span className="text-red-500">*</span>
              </h2>
              <button
                type="button"
                onClick={() => addTokenEntry('typography')}
                className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加字体
              </button>
            </div>
            <div className="space-y-3">
              {formState.typography.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                  暂无字体定义，点击上方按钮添加
                </p>
              ) : (
                formState.typography.map((typography) => (
                  <div key={typography.id} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={typography.key}
                      onChange={(e) => updateTokenEntry('typography', typography.id, e.target.value, typography.value)}
                      placeholder="名称（如 heading）"
                      className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={typography.value}
                      onChange={(e) => updateTokenEntry('typography', typography.id, typography.key, e.target.value)}
                      placeholder="例如：'Inter', 32px/1.2, bold 或 56px / 1.07 / 600"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeTokenEntry('typography', typography.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="删除"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                间距列表
              </h2>
              <button
                type="button"
                onClick={() => addTokenEntry('spacing')}
                className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加间距
              </button>
            </div>
            <div className="space-y-3">
              {formState.spacing.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                  暂无间距定义，点击上方按钮添加（可选）
                </p>
              ) : (
                formState.spacing.map((spacing) => (
                  <div key={spacing.id} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={spacing.key}
                      onChange={(e) => updateTokenEntry('spacing', spacing.id, e.target.value, spacing.value)}
                      placeholder="名称（如 small）"
                      className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={spacing.value}
                      onChange={(e) => updateTokenEntry('spacing', spacing.id, spacing.key, e.target.value)}
                      placeholder="例如：8px 或 0.5rem"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeTokenEntry('spacing', spacing.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="删除"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                待确认事项
              </h2>
              <button
                type="button"
                onClick={addUnresolved}
                className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加事项
              </button>
            </div>
            <div className="space-y-3">
              {formState.unresolved.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                  暂无待确认事项，点击上方按钮添加（可选）
                </p>
              ) : (
                formState.unresolved.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateUnresolved(index, e.target.value)}
                      placeholder="描述需要确认的事项..."
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeUnresolved(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="删除"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
