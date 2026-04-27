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

export type ErrorType = 
  | 'validation_error' 
  | 'file_format_error' 
  | 'file_size_error' 
  | 'file_read_error' 
  | 'database_error' 
  | 'server_error' 
  | 'network_error' 
  | 'unknown_error';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: ErrorType;
}
