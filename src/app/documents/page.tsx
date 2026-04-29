'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Document, DocumentType, ApiResponse } from '@/lib/types';

const PAGE_SIZE = 10;

const sortFields = [
  { value: 'created_at', label: '创建时间' },
  { value: 'updated_at', label: '更新时间' },
  { value: 'title', label: '标题' },
];

const sortOrders = [
  { value: 'desc', label: '降序' },
  { value: 'asc', label: '升序' },
];

export default function DocumentsPage() {
  const router = useRouter();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [typeId, setTypeId] = useState<number | null | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [deletingDoc, setDeletingDoc] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getTypeInfo = (docTypeId: number | null) => {
    if (docTypeId === null) {
      return { name: '无类型', color: '#9CA3AF' };
    }
    const type = types.find(t => t.id === docTypeId);
    if (type) {
      return { name: type.name, color: type.color };
    }
    return { name: '未知类型', color: '#9CA3AF' };
  };

  const getSourceTypeText = (sourceType: string) => {
    return sourceType === 'file' ? '文件导入' : '粘贴内容';
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      
      let documentsUrl = `/api/documents?limit=${PAGE_SIZE}&offset=${offset}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (typeId !== undefined) {
        documentsUrl += `&typeId=${typeId === null ? 'null' : typeId}`;
      }
      if (searchTerm.trim()) {
        documentsUrl += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const [documentsResponse, typesResponse] = await Promise.all([
        fetch(documentsUrl),
        fetch('/api/types'),
      ]);
      
      const documentsData: ApiResponse<{ documents: Document[]; total: number }> = await documentsResponse.json();
      const typesData: ApiResponse<{ types: DocumentType[] }> = await typesResponse.json();
      
      if (!documentsResponse.ok || !documentsData.success) {
        setError(documentsData.error || '获取文档列表失败');
        return;
      }
      
      if (typesResponse.ok && typesData.success && typesData.data?.types) {
        setTypes(typesData.data.types);
      }
      
      setDocuments(documentsData.data?.documents || []);
      setTotalDocuments(documentsData.data?.total || 0);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('获取文档列表失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, typeId, sortBy, sortOrder, searchTerm]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/documents/${deletingDoc.id}`, {
        method: 'DELETE',
      });
      
      const data: ApiResponse<null> = await response.json();
      
      if (!response.ok || !data.success) {
        setDeleteError(data.error || '删除失败');
        return;
      }
      
      setDeletingDoc(null);
      fetchData();
      router.refresh();
    } catch (err) {
      console.error('Error deleting document:', err);
      setDeleteError('删除失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setTypeId(undefined);
    } else if (value === 'null') {
      setTypeId(null);
    } else {
      setTypeId(parseInt(value, 10));
    }
    setCurrentPage(1);
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'created_at' | 'updated_at' | 'title');
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
  };

  const totalPages = Math.ceil(totalDocuments / PAGE_SIZE);

  if (isLoading && documents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16 text-gray-600 dark:text-gray-400">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            文档列表
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            共 {totalDocuments} 个文档
          </p>
        </div>
        {/* <Link
          href="/documents/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          新建文档
        </Link> */}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                搜索与筛选
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                按标题或内容搜索文档，支持与类型筛选、排序组合使用
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  搜索文档
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="按标题或内容搜索..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    搜索
                  </button>
                </div>
              </div>
            </div>

            {searchTerm && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                当前搜索关键词: <span className="font-medium text-indigo-600 dark:text-indigo-400">"{searchTerm}"</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  清除搜索
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                按类型筛选
              </label>
              <select
                value={typeId === undefined ? '' : (typeId === null ? 'null' : typeId)}
                onChange={handleTypeChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部类型</option>
                <option value="null">无类型</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                排序字段
              </label>
              <select
                value={sortBy}
                onChange={handleSortByChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {sortFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                排序方式
              </label>
              <select
                value={sortOrder}
                onChange={handleSortOrderChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {sortOrders.map((order) => (
                  <option key={order.value} value={order.value}>
                    {order.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {documents.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      来源类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      更新时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {documents.map((doc) => {
                    const typeInfo = getTypeInfo(doc.type_id);
                    return (
                      <tr 
                        key={doc.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium"
                          >
                            {doc.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {getSourceTypeText(doc.source_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="inline-block px-2 py-1 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: typeInfo.color }}
                          >
                            {typeInfo.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(doc.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(doc.updated_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-4">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                            >
                              查看
                            </Link>
                            <Link
                              href={`/documents/${doc.id}/preview`}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium"
                            >
                              预览
                            </Link>
                            <Link
                              href={`/documents/${doc.id}/schema`}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                            >
                              Schema
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeletingDoc({ id: doc.id, title: doc.title })}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                第 {currentPage} 页 / 共 {totalPages} 页
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无文档
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {typeId !== undefined 
              ? '当前筛选条件下没有文档' 
              : '您还没有创建任何文档'}
          </p>
        </div>
      )}

      {deletingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                确认删除
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                确定要删除文档 "{deletingDoc.title}" 吗？此操作无法撤销。
              </p>
              
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingDoc(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
