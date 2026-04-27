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

export interface SchemaMeta {
  name: string;
  description: string;
  keywords: string[];
}

export interface SchemaTokens {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  radii: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  opacity: Record<string, string>;
  zIndex: Record<string, string>;
}

export interface Schema {
  id: number;
  document_id: number;
  meta: SchemaMeta;
  tokens: SchemaTokens;
  unresolved: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateSchemaRequest {
  document_id: number;
  meta?: Partial<SchemaMeta>;
  tokens?: Partial<SchemaTokens>;
  unresolved?: string[];
}

export interface UpdateSchemaRequest {
  meta?: Partial<SchemaMeta>;
  tokens?: Partial<SchemaTokens>;
  unresolved?: string[];
}

export interface SyncSchemaRequest {
  document_id: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: ErrorType;
}
