'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DesignPreview } from '@/components/DesignPreview';
import { isSchemaReady, schemaToDesignPreviewData } from '@/lib/design-preview/schema-converter';
import { notFound } from 'next/navigation';
import type { Schema } from '@/lib/types';
import type { ParseResult } from '@/lib/design-preview/types';

const readResponseJson = async <T,>(response: Response): Promise<{ success: boolean; data?: T; error?: string; details?: string[] }> => {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: `服务返回了不可解析的响应，HTTP ${response.status}`,
    };
  }
};

const SchemaNotReadyDisplay = ({ documentId, schema }: { documentId: number; schema: Schema }) => {
  const missingItems: string[] = [];

  if (!schema.meta.name) missingItems.push('设计系统名称（meta.name）');
  if (!schema.meta.description) missingItems.push('设计系统描述（meta.description）');
  if (Object.keys(schema.tokens.colors).length === 0) missingItems.push('颜色列表（tokens.colors）');
  if (Object.keys(schema.tokens.typography).length === 0) missingItems.push('字体列表（tokens.typography）');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Schema 尚未配置完成
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                预览页需要完整的 Schema 数据才能正常渲染
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              缺少以下配置：
            </h2>
            <ul className="space-y-2">
              {missingItems.map((item, index) => (
                <li key={index} className="flex items-start text-gray-700 dark:text-gray-300">
                  <span className="text-red-500 mr-2 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>提示：</strong>你可以点击下方按钮前往 Schema 页面手动填写，或者使用「从 Markdown 重新提取」功能自动解析原始文档内容。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/documents/${documentId}/schema`}
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              前往 Schema 页面
            </Link>
            <Link
              href={`/documents/${documentId}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回文档
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewToolbar = ({
  documentId,
  isDark,
  onToggleDark,
}: {
  documentId: number;
  isDark: boolean;
  onToggleDark: () => void;
}) => {
  return (
    <div className="fixed left-4 right-4 top-4 z-50 flex items-center justify-between">
      <Link
        href={`/documents/${documentId}`}
        className="inline-flex h-10 items-center rounded-full border border-gray-200 bg-white/90 px-3 text-sm font-medium text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-indigo-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        返回文档
      </Link>

      <button
        type="button"
        onClick={onToggleDark}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDark ? (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default function PreviewPage() {
  const params = useParams();
  const documentId = useMemo(() => Number.parseInt(params.id as string, 10), [params.id]);

  const [schema, setSchema] = useState<Schema | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (Number.isNaN(documentId)) {
        notFound();
      }

      setIsLoading(true);
      setErrors([]);

      try {
        const documentResponse = await fetch(`/api/documents/${documentId}`);
        const documentData = await readResponseJson<unknown>(documentResponse);

        if (!documentResponse.ok || !documentData.success || !documentData.data) {
          notFound();
        }

        const schemaResponse = await fetch(`/api/documents/${documentId}/schema`);
        const schemaData = await readResponseJson<Schema>(schemaResponse);

        if (!schemaResponse.ok || !schemaData.success || !schemaData.data) {
          setErrors([schemaData.error || '获取 Schema 失败', ...(schemaData.details || [])]);
          setIsLoading(false);
          return;
        }

        const schemaResult = schemaData.data;
        setSchema(schemaResult);

        const result = schemaToDesignPreviewData(schemaResult);
        setParseResult(result);
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrors(['获取数据失败，请检查服务是否可用后重试']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [documentId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const rootElement = document.documentElement;
    if (!rootElement) return;

    if (isDark) {
      rootElement.classList.add('dark');
    } else {
      rootElement.classList.remove('dark');
    }
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">
          加载中...
        </div>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4">
              加载失败
            </h1>
            <ul className="space-y-2 text-red-700 dark:text-red-300">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/documents"
              className="inline-flex items-center mt-6 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              返回文档列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">Schema 数据不可用</p>
          <Link
            href="/documents"
            className="inline-flex items-center mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            返回文档列表
          </Link>
        </div>
      </div>
    );
  }

  if (!isSchemaReady(schema)) {
    return (
      <div className="relative">
        <PreviewToolbar documentId={documentId} isDark={isDark} onToggleDark={() => setIsDark(!isDark)} />
        <SchemaNotReadyDisplay documentId={documentId} schema={schema} />
      </div>
    );
  }

  if (!parseResult) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">
          准备中...
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <PreviewToolbar documentId={documentId} isDark={isDark} onToggleDark={() => setIsDark(!isDark)} />
      <DesignPreview parseResult={parseResult} />
    </div>
  );
}
