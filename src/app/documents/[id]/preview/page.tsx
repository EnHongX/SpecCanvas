'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { documentModel } from '@/lib/models/document';
import { parseDesignMarkdown } from '@/lib/design-preview';
import { DesignPreview } from '@/components/DesignPreview';
import { notFound } from 'next/navigation';
import type { Document } from '@/lib/types';
import type { ParseResult } from '@/lib/design-preview/types';

interface PreviewPageProps {
  params: {
    id: string;
  };
}

export default function PreviewPage() {
  const params = useParams();
  const documentId = parseInt(params.id as string, 10);
  
  const [document, setDocument] = useState<Document | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (Number.isNaN(documentId)) {
        notFound();
      }
      
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        const data = await response.json();
        
        if (!response.ok || !data.success || !data.data) {
          notFound();
        }
        
        const doc = data.data as Document;
        setDocument(doc);
        
        const result = parseDesignMarkdown(doc.raw_markdown);
        setParseResult(result);
      } catch (error) {
        console.error('Error fetching document:', error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [documentId]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (isLoading || !parseResult) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed top-4 left-4 z-50 flex items-center gap-4">
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回文档
        </Link>
        
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDark ? (
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
      
      <DesignPreview parseResult={parseResult} />
    </div>
  );
}
