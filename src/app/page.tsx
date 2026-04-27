import Link from 'next/link';
import { documentModel } from '@/lib/models/document';
import type { Document } from '@/lib/types';

export default async function Home() {
  let documents: Document[] = [];
  let totalDocuments = 0;
  
  try {
    documents = await documentModel.getAll(5);
    totalDocuments = await documentModel.count();
  } catch (error) {
    console.error('Error fetching documents:', error);
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          欢迎使用 SpecCanvas
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          一个简单而强大的 Markdown 文档管理系统，让您的文档管理变得轻松高效。
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/documents/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            新建文档
          </Link>
          <Link
            href="/documents"
            className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-700 dark:border-indigo-600 dark:hover:bg-indigo-900/20 px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            浏览文档
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
          核心功能
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              两种导入方式
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              支持上传本地 Markdown 文件或直接粘贴 Markdown 内容，灵活满足您的需求。
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              文档列表管理
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              清晰的文档列表展示，支持查看所有文档，快速定位和访问您的内容。
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              本地数据存储
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              使用 SQLite 本地存储所有数据都保存在本地，安全可靠无需担心数据泄露。
            </p>
          </div>
        </div>
      </section>

      {/* Recent Documents Section */}
      {documents.length > 0 && (
        <section className="py-12">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              最近文档
            </h3>
            <Link
              href="/documents"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              查看全部 ({totalDocuments})
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="block bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {doc.title}
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`}>
                  {doc.source_type === 'file' ? '文件导入' : '粘贴内容'}
                </span>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  doc.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : doc.status === 'published'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {doc.status === 'draft' ? '草稿' : doc.status === 'published' ? '已发布' : '已归档'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                创建于: {new Date(doc.created_at).toLocaleString('zh-CN')}
              </p>
            </Link>
          ))}
          </div>
        </section>
      )}
    </div>
  );
}
