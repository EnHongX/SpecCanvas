'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteDocumentButtonProps {
  documentId: number;
  documentTitle: string;
}

export default function DeleteDocumentButton({ documentId, documentTitle }: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || '删除失败，请稍后重试');
        setIsDeleting(false);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('删除失败，请稍后重试');
      setIsDeleting(false);
    }
  };

  return (
    <div className="inline-block">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
        >
          删除
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            确认删除 "{documentTitle}"?
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '删除中...' : '确认'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors disabled:opacity-50"
          >
            取消
          </button>
        </div>
      )}
      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
