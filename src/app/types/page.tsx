'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DocumentType, ApiResponse } from '@/lib/types';

interface FormState {
  name: string;
  description: string;
  color: string;
}

interface Document {
  id: number;
  title: string;
  source_type: 'file' | 'paste';
  raw_markdown: string;
  type_id: number | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

export default function TypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [deletingType, setDeletingType] = useState<DocumentType | null>(null);
  const [deletingTypeUsage, setDeletingTypeUsage] = useState<{ count: number; documents: Document[] } | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  
  const [formState, setFormState] = useState<FormState>({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/types');
      const data: ApiResponse<{ types: DocumentType[] }> = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || '获取类型列表失败');
        return;
      }
      
      setTypes(data.data?.types || []);
    } catch (err) {
      console.error('Error fetching types:', err);
      setError('获取类型列表失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormState({
      name: '',
      description: '',
      color: '#3B82F6'
    });
    setError(null);
    setSuccessMessage(null);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingType(null);
    setShowCreateModal(true);
  };

  const openEditModal = (type: DocumentType) => {
    setFormState({
      name: type.name,
      description: type.description,
      color: type.color
    });
    setEditingType(type);
    setError(null);
    setShowCreateModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleColorSelect = (color: string) => {
    setFormState(prev => ({ ...prev, color }));
  };

  const fetchTypeUsage = async (typeId: number) => {
    setIsLoadingUsage(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents?typeId=${typeId}&limit=5&offset=0`);
      const data: ApiResponse<{ documents: Document[]; total: number }> = await response.json();
      
      if (response.ok && data.success) {
        setDeletingTypeUsage({
          count: data.data?.total || 0,
          documents: data.data?.documents || [],
        });
      } else {
        setDeletingTypeUsage({ count: 0, documents: [] });
      }
    } catch (err) {
      console.error('Error fetching type usage:', err);
      setDeletingTypeUsage({ count: 0, documents: [] });
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleDeleteClick = async (type: DocumentType) => {
    setDeletingType(type);
    setDeletingTypeUsage(null);
    setError(null);
    await fetchTypeUsage(type.id);
  };

  const handleCancelDelete = () => {
    setDeletingType(null);
    setDeletingTypeUsage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsCreating(true);

    try {
      if (!formState.name.trim()) {
        setError('类型名称不能为空');
        return;
      }

      let response: Response;
      
      if (editingType) {
        response = await fetch(`/api/types/${editingType.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formState.name.trim(),
            description: formState.description.trim(),
            color: formState.color
          }),
        });
      } else {
        response = await fetch('/api/types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formState.name.trim(),
            description: formState.description.trim(),
            color: formState.color
          }),
        });
      }
      
      const data: ApiResponse<DocumentType> = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || (editingType ? '更新类型失败' : '创建类型失败'));
        return;
      }
      
      setSuccessMessage(editingType ? '类型已更新' : '类型已创建');
      setShowCreateModal(false);
      fetchTypes();
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      setError(editingType ? '更新类型失败，请稍后重试' : '创建类型失败，请稍后重试');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch(`/api/types/${deletingType.id}`, {
        method: 'DELETE',
      });
      
      const data: ApiResponse<null> = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || '删除类型失败');
        return;
      }
      
      setDeletingType(null);
      fetchTypes();
      router.refresh();
    } catch (err) {
      console.error('Error deleting type:', err);
      setError('删除类型失败，请稍后重试');
    } finally {
      setIsCreating(false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            类型管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            共 {types.length} 个类型
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          新建类型
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {types.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    类型名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    颜色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {types.map((type) => (
                  <tr 
                    key={type.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {type.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="color"
                          value={type.color}
                          disabled
                          className="w-8 h-8 rounded border-0 cursor-default"
                        />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {type.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(type.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(type)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(type)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无类型
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            您还没有创建任何类型，开始创建您的第一个类型吧。
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            新建类型
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingType ? '编辑类型' : '新建类型'}
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label 
                    htmlFor="name" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    类型名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formState.name}
                    onChange={handleInputChange}
                    placeholder="请输入类型名称"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label 
                    htmlFor="description" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formState.description}
                    onChange={handleInputChange}
                    placeholder="请输入类型描述（可选）"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    颜色
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          formState.color === color ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-indigo-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={formState.color}
                        onChange={(e) => handleColorSelect(e.target.value)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    当前颜色: <span className="font-mono">{formState.color}</span>
                  </p>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? '保存中...' : (editingType ? '保存修改' : '创建类型')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deletingType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                确认删除类型
              </h2>
              
              {isLoadingUsage ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">正在检查类型使用情况...</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    确定要删除类型 <span className="font-semibold">"{deletingType.name}"</span> 吗？此操作无法撤销。
                  </p>
                  
                  {deletingTypeUsage && (
                    <div className={`mb-4 p-4 rounded-lg ${
                      deletingTypeUsage.count > 0 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
                        : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    }`}>
                      {deletingTypeUsage.count > 0 ? (
                        <>
                          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                            ⚠️ 该类型正在被 <span className="text-lg font-bold">{deletingTypeUsage.count}</span> 个文档使用
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                            无法删除此类型，因为有文档绑定了此类型。请先为这些文档重新分配类型。
                          </p>
                          {deletingTypeUsage.documents.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                                使用此类型的部分文档：
                              </p>
                              <ul className="space-y-1">
                                {deletingTypeUsage.documents.map((doc) => (
                                  <li key={doc.id} className="text-sm text-amber-700 dark:text-amber-300 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
                                    {doc.title}
                                  </li>
                                ))}
                                {deletingTypeUsage.count > deletingTypeUsage.documents.length && (
                                  <li className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2"></span>
                                    ...还有 {deletingTypeUsage.count - deletingTypeUsage.documents.length} 个文档
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-green-700 dark:text-green-300">
                          ✓ 该类型没有被任何文档使用，可以安全删除。
                        </p>
                      )}
                    </div>
                  )}
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      disabled={isCreating}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      取消
                    </button>
                    {deletingTypeUsage && deletingTypeUsage.count === 0 && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isCreating}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? '删除中...' : '确认删除'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
