'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { validateSchemaContent } from '@/lib/schema-v0';
import type { ApiResponse, Document, Schema, SchemaContent } from '@/lib/types';

const toEditableSchema = (schema: Schema): SchemaContent => ({
  meta: schema.meta,
  tokens: schema.tokens,
  unresolved: schema.unresolved,
});

const formatSchema = (schema: Schema): string => {
  return JSON.stringify(toEditableSchema(schema), null, 2);
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

export default function SchemaPage() {
  const params = useParams();
  const documentId = useMemo(() => Number.parseInt(params.id as string, 10), [params.id]);

  const [schema, setSchema] = useState<Schema | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setSchema(schemaData.data);
        setEditorValue(formatSchema(schemaData.data));
      } catch {
        setErrors(['获取数据失败，请检查服务是否可用后重试']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [documentId]);

  const handleSave = async () => {
    setErrors([]);
    setSuccessMessage(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(editorValue);
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

    setIsSaving(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/schema`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.value),
      });

      const data = await readResponseJson<Schema>(response);

      if (!response.ok || !data.success || !data.data) {
        setErrors([
          data.error || `保存失败，HTTP ${response.status}`,
          ...(data.details || []),
        ]);
        return;
      }

      setSchema(data.data);
      setEditorValue(formatSchema(data.data));
      setSuccessMessage('Schema 已保存');
    } catch {
      setErrors(['保存失败，请检查网络或服务状态后重试']);
    } finally {
      setIsSaving(false);
    }
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
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回文档
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存 Schema'}
        </button>
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schema v0
          </h2>
        </div>
        <div className="p-6">
          <label htmlFor="schema-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            JSON 内容
          </label>
          <textarea
            id="schema-editor"
            value={editorValue}
            onChange={(event) => {
              setEditorValue(event.target.value);
              if (errors.length > 0) setErrors([]);
              if (successMessage) setSuccessMessage(null);
            }}
            spellCheck={false}
            className="w-full min-h-[520px] resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 font-mono text-sm leading-6 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
