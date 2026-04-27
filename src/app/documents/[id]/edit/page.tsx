'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface FormState {
  title: string;
  raw_markdown: string;
  status: 'draft' | 'published' | 'archived';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
}

interface Document {
  id: number;
  title: string;
  source_type: 'file' | 'paste';
  raw_markdown: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ERROR_TYPE_MESSAGES: Record<string, string> = {
  'validation_error': '输入验证失败',
  'database_error': '数据库操作失败',
  'server_error': '服务器内部错误',
  'network_error': '网络连接失败',
  'unknown_error': '发生未知错误'
};

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = parseInt(params.id as string, 10);
  
  const [formState, setFormState] = useState<FormState>({
    title: '',
    raw_markdown: '',
    status: 'draft',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (isNaN(documentId)) {
        setError('无效的文档 ID');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/documents/${documentId}`);
        const data: ApiResponse<Document> = await response.json();

        if (!response.ok || !data.success || !data.data) {
          setError(data.error || '获取文档失败');
          setIsLoading(false);
          return;
        }

        setFormState({
          title: data.data.title,
          raw_markdown: data.data.raw_markdown,
          status: data.data.status,
        });
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('获取文档失败，请稍后重试');
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!formState.title.trim()) {
      setError('请输入文档标题');
      return;
    }
    
    if (!formState.raw_markdown.trim()) {
      setError('请输入 Markdown 内容');
      return;
    }
    
    if (formState.title.length > 200) {
      setError('标题长度不能超过 200 个字符');
      return;
    }
    
    const contentSize = new Blob([formState.raw_markdown]).size;
    if (contentSize > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setError(`内容大小超出限制。最大允许 ${sizeInMB}MB，请减少内容长度。`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formState.title.trim(),
          raw_markdown: formState.raw_markdown,
          status: formState.status,
        }),
      });
      
      let data: ApiResponse<Document>;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setError('服务器响应格式错误，请稍后重试。');
        return;
      }
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error || '更新文档失败';
        const errorType = data.errorType;
        
        if (errorType) {
          const typeMessage = ERROR_TYPE_MESSAGES[errorType] || '更新文档失败';
          setError(`${typeMessage}: ${errorMessage}`);
        } else {
          setError(errorMessage);
        }
        return;
      }
      
      setSuccessMessage('文档保存成功！');
      router.refresh();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('更新文档时发生未知错误，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && isNaN(documentId)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            文档不存在
          </h1>
          <Link
            href="/documents"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            返回文档列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              编辑文档
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              修改文档内容后点击保存
            </p>
          </div>
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回详情
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <label 
            htmlFor="title" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            文档标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formState.title}
            onChange={handleInputChange}
            placeholder="请输入文档标题"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <label 
            htmlFor="status" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            文档状态
          </label>
          <select
            id="status"
            name="status"
            value={formState.status}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="archived">已归档</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <label 
            htmlFor="raw_markdown" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Markdown 内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="raw_markdown"
            name="raw_markdown"
            value={formState.raw_markdown}
            onChange={handleInputChange}
            placeholder="请输入 Markdown 内容..."
            rows={20}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href={`/documents/${documentId}`}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  );
}
