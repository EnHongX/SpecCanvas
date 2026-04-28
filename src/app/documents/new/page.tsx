'use client';

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentType } from '@/lib/types';

interface FormState {
  title: string;
  raw_markdown: string;
  type_id: number | null;
  source_type: 'file' | 'paste';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['.md', '.markdown'];
const ALLOWED_MIME_TYPES = ['text/markdown', 'text/plain'];

// 错误类型到用户友好提示的映射
const ERROR_TYPE_MESSAGES: Record<string, string> = {
  'validation_error': '输入验证失败',
  'file_format_error': '文件格式错误',
  'file_size_error': '文件大小超出限制',
  'file_read_error': '文件读取失败',
  'database_error': '数据库操作失败',
  'server_error': '服务器内部错误',
  'network_error': '网络连接失败',
  'unknown_error': '发生未知错误'
};

export default function NewDocumentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formState, setFormState] = useState<FormState>({
    title: '',
    raw_markdown: '',
    type_id: null,
    source_type: 'paste',
  });
  
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch('/api/types');
        const data = await response.json();
        if (data.success && data.data?.types) {
          setTypes(data.data.types);
        }
      } catch (err) {
        console.error('Error fetching types:', err);
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'type_id') {
      setFormState(prev => ({ 
        ...prev, 
        [name]: value === '' ? null : parseInt(value, 10) 
      }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleSourceTypeChange = (type: 'file' | 'paste') => {
    setFormState(prev => ({ 
      ...prev, 
      source_type: type,
      raw_markdown: '' 
    }));
    setFileName(null);
    setError(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ALLOWED_FILE_TYPES.includes(fileExtension);
    const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
    
    if (!isValidExtension) {
      setError(`不支持的文件格式。请上传 ${ALLOWED_FILE_TYPES.join(' 或 ')} 格式的文件。`);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setError(`文件大小超出限制。最大允许 ${sizeInMB}MB，请选择更小的文件。`);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 验证文件是否为空
    if (file.size === 0) {
      setError('文件为空，请选择包含内容的 Markdown 文件。');
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // 验证文件内容
      if (!content || content.trim() === '') {
        setError('文件内容为空，请选择包含有效 Markdown 内容的文件。');
        setFileName(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setFormState(prev => ({ 
        ...prev, 
        raw_markdown: content,
        source_type: 'file'
      }));
      
      // 尝试从文件名提取标题
      const titleFromFileName = file.name.replace(/\.md$/, '');
      if (titleFromFileName && !formState.title) {
        setFormState(prev => ({ ...prev, title: titleFromFileName }));
      }
      
      setError(null);
    };
    reader.onerror = () => {
      setError('文件读取失败，请尝试重新上传或选择其他文件。');
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 验证表单
    if (!formState.title.trim()) {
      setError('请输入文档标题');
      return;
    }
    
    if (!formState.raw_markdown.trim()) {
      setError('请上传 Markdown 文件或粘贴 Markdown 内容');
      return;
    }
    
    // 额外验证
    if (formState.title.length > 200) {
      setError('标题长度不能超过 200 个字符');
      return;
    }
    
    // 验证内容大小
    const contentSize = new Blob([formState.raw_markdown]).size;
    if (contentSize > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setError(`内容大小超出限制。最大允许 ${sizeInMB}MB，请减少内容长度。`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let response: Response;
      try {
        response = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formState.title.trim(),
            raw_markdown: formState.raw_markdown,
            source_type: formState.source_type,
            type_id: formState.type_id,
          }),
        });
      } catch (fetchError) {
        // 网络错误
        console.error('Network error:', fetchError);
        setError('网络连接失败，请检查您的网络连接后重试。');
        return;
      }
      
      let data: ApiResponse<{ id: number }>;
      try {
        data = await response.json();
      } catch (parseError) {
        // 响应解析错误
        console.error('Error parsing response:', parseError);
        setError('服务器响应格式错误，请稍后重试。');
        return;
      }
      
      if (!response.ok || !data.success) {
        // 根据错误类型显示不同的提示
        const errorMessage = data.error || '创建文档失败';
        const errorType = data.errorType;
        
        if (errorType) {
          // 如果有错误类型，使用更详细的提示
          const typeMessage = ERROR_TYPE_MESSAGES[errorType] || '创建文档失败';
          setError(`${typeMessage}: ${errorMessage}`);
        } else {
          // 如果没有错误类型，使用通用提示
          setError(errorMessage);
        }
        return;
      }
      
      // 跳转到文档列表页
      router.push('/documents');
      router.refresh();
    } catch (err) {
      // 捕获所有其他错误
      console.error('Unexpected error:', err);
      setError('创建文档时发生未知错误，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          新建文档
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          上传 Markdown 文件或直接粘贴内容来创建新文档
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
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

        {/* Type Selection */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <label 
            htmlFor="type_id" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            文档类型
          </label>
          {isLoadingTypes ? (
            <div className="py-2 text-gray-500 dark:text-gray-400">
              加载类型列表...
            </div>
          ) : (
            <div className="space-y-2">
              <select
                id="type_id"
                name="type_id"
                value={formState.type_id === null ? '' : formState.type_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">无类型</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {formState.type_id !== null && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ 
                      backgroundColor: types.find(t => t.id === formState.type_id)?.color || '#3B82F6' 
                    }}
                  />
                  <span>
                    {types.find(t => t.id === formState.type_id)?.description || '暂无描述'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Input Type Selection */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            内容导入方式
          </label>
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => handleSourceTypeChange('paste')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                formState.source_type === 'paste'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              粘贴内容
            </button>
            <button
              type="button"
              onClick={() => handleSourceTypeChange('file')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                formState.source_type === 'file'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              上传文件
            </button>
          </div>

          {/* Paste Content */}
          {formState.source_type === 'paste' && (
            <div>
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
                placeholder="请粘贴您的 Markdown 内容..."
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              />
            </div>
          )}

          {/* Upload File */}
          {formState.source_type === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                上传 Markdown 文件 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>上传文件</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".md,.markdown"
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">或拖放文件</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    支持 .md 和 .markdown 格式
                  </p>
                  {fileName && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      已选择文件: {fileName}
                    </p>
                  )}
                </div>
              </div>
              
              {formState.raw_markdown && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    预览内容 (前 500 个字符)
                  </label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                      {formState.raw_markdown.substring(0, 500)}
                      {formState.raw_markdown.length > 500 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '创建中...' : '创建文档'}
          </button>
        </div>
      </form>
    </div>
  );
}
