export interface Document {
  id: number;
  title: string;
  source_type: 'file' | 'paste';
  raw_markdown: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentRequest {
  title: string;
  source_type: 'file' | 'paste';
  raw_markdown: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateDocumentRequest {
  title?: string;
  raw_markdown?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
