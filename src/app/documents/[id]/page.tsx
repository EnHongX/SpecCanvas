import { documentModel } from '@/lib/models/document';
import { Document } from '@/lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface DocumentPageProps {
  params: {
    id: string;
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const id = parseInt(params.id, 10);
  
  if (isNaN(id)) {
    notFound();
  }
  
  let document: Document | null = null;
  
  try {
    document = await documentModel.getById(id);
  } catch (error) {
    console.error('Error fetching document:', error);
  }
  
  if (!document) {
    notFound();
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'published':
        return '已发布';
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  const getSourceTypeText = (sourceType: string) => {
    return sourceType === 'file' ? '文件导入' : '粘贴内容';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/documents"
          className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回列表
        </Link>
      </div>

      {/* Document Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {document.title}
        </h1>
        
        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <span className="mr-2 font-medium">来源类型:</span>
            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {getSourceTypeText(document.source_type)}
            </span>
          </div>
          
          <div className="flex items-center">
            <span className="mr-2 font-medium">状态:</span>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(document.status)}`}>
              {getStatusText(document.status)}
            </span>
          </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>创建于: {new Date(document.created_at).toLocaleString('zh-CN')}</span>
          </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>更新于: {new Date(document.updated_at).toLocaleString('zh-CN')}</span>
          </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span>文档 ID: {document.id}</span>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            原始 Markdown 内容
          </h2>
        </div>
        <div className="p-6">
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {document.raw_markdown}
          </pre>
        </div>
      </div>

      {/* Character Count Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          内容统计
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {document.raw_markdown.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              字符数 (含空格)
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {document.raw_markdown.replace(/\s/g, '').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              字符数 (不含空格)
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {document.raw_markdown.split('\n').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              行数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
