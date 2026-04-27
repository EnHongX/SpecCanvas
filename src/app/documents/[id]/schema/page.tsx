'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface SchemaMeta {
  name: string;
  description: string;
  keywords: string[];
}

interface SchemaTokens {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
}

interface Schema {
  id: number;
  document_id: number;
  meta: SchemaMeta;
  tokens: SchemaTokens;
  unresolved: string[];
  created_at: string;
  updated_at: string;
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
}

const COLOR_PATTERNS = [
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,
  /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i,
  /^hsl\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)$/i,
  /^hsla\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+\s*\)$/i,
];

const CSS_COLOR_NAMES = [
  'transparent', 'currentColor', 'inherit',
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure',
  'beige', 'bisque', 'black', 'blanchedalmond', 'blue',
  'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson',
  'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
  'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen',
  'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet',
  'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
  'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
  'ghostwhite', 'gold', 'goldenrod', 'gray', 'green',
  'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush',
  'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
  'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
  'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin',
  'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab',
  'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen',
  'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru',
  'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon',
  'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
  'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle',
  'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen'
];

const SPACING_UNITS = ['px', 'rem', 'em', '%', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'ex'];

const INVALID_TYPOGRAPHY_KEYS = ['key', 'white', 'font', 'color', 'colors', 'spacing', 'breakpoint', 'breakpoints'];

const isValidColor = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (CSS_COLOR_NAMES.includes(trimmed)) return true;
  return COLOR_PATTERNS.some(pattern => pattern.test(trimmed));
};

const isLikelySpacingValue = (value: string): boolean => {
  const trimmed = value.trim();
  
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return num >= 0 && num <= 500;
  }
  
  for (const unit of SPACING_UNITS) {
    if (trimmed.toLowerCase().endsWith(unit.toLowerCase())) {
      const numPart = trimmed.slice(0, -unit.length);
      if (/^[\d.]+$/.test(numPart)) {
        return true;
      }
    }
  }
  
  if (/^calc\(.+\)$/i.test(trimmed)) return true;
  if (/^min\(.+\)$/i.test(trimmed)) return true;
  if (/^max\(.+\)$/i.test(trimmed)) return true;
  if (/^clamp\(.+\)$/i.test(trimmed)) return true;
  
  return false;
};

const isLikelyTypographyValue = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  
  if (trimmed.startsWith('#') || isValidColor(trimmed)) return false;
  if (isLikelySpacingValue(trimmed)) return false;
  
  const typographyPatterns = [
    /^\d+(?:px|rem|em|pt)$/,
    /^\d+(?:px|rem|em|pt)\s+\/\s*\d+(?:px|rem|em|pt)?$/,
    /^(normal|bold|lighter|bolder|[1-9]00)$/,
    /^(sans-serif|serif|monospace|cursive|fantasy)$/,
    /^(left|center|right|justify)$/,
    /^(uppercase|lowercase|capitalize|none)$/,
    /^(italic|oblique|normal)$/,
    /^['"].*['"]$/,
    /^[A-Z][a-zA-Z\s-]+$/,
  ];
  
  return typographyPatterns.some(pattern => pattern.test(trimmed));
};

const isInvalidTypographyKey = (key: string): boolean => {
  const lowerKey = key.trim().toLowerCase();
  return INVALID_TYPOGRAPHY_KEYS.includes(lowerKey);
};

const parseRangeValue = (value: string): string => {
  const trimmed = value.trim();
  
  const rangeMatch = trimmed.match(/^(\d+(?:px|rem|em|%)?)\s*[-–—]\s*(\d+(?:px|rem|em|%)?)$/);
  if (rangeMatch) {
    return `${rangeMatch[1]}–${rangeMatch[2]}`;
  }
  
  const multiRangeMatch = trimmed.match(/^(\d+(?:px|rem|em|%)?)\s*[-–—]\s*(\d+(?:px|rem|em|%)?)\s*[-–—]\s*(\d+(?:px|rem|em|%)?)$/);
  if (multiRangeMatch) {
    return `${multiRangeMatch[1]}–${multiRangeMatch[2]}–${multiRangeMatch[3]}`;
  }
  
  return trimmed;
};

const parseKeyValue = (line: string): { key: string; value: string } | null => {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
    return null;
  }
  
  const patterns = [
    /^[*-]?\s*[`"]?([\w\s\-._/]+)[`"]?\s*[:：]\s*(.+)$/,
    /^[*-]?\s*[`"]?([\w\s\-._/]+)[`"]?\s+[-–—]\s+(.+)$/,
    /^[*-]?\s*[`"]?([\w\s\-._/]+)[`"]?\s*=\s*(.+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      
      value = value.replace(/^[`"\s]+|[`"\s,.;]+$/g, '');
      key = key.replace(/^[`"\s]+|[`"\s]+$/g, '');
      
      value = parseRangeValue(value);
      
      if (key && value) {
        return { key, value };
      }
    }
  }
  
  return null;
};

const parseDocumentToSchema = (doc: Document): { meta: Partial<SchemaMeta>; tokens: Partial<SchemaTokens>; unresolved: string[] } => {
  const markdown = doc.raw_markdown;
  const lines = markdown.split('\n');
  
  const meta: Partial<SchemaMeta> = {
    name: doc.title,
    description: '',
    keywords: [],
  };
  
  const tokens: Partial<SchemaTokens> = {
    colors: {},
    typography: {},
    spacing: {},
  };
  
  const unresolved: string[] = [];
  
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const fmLines = frontmatter.split('\n');
    
    for (const line of fmLines) {
      const kv = parseKeyValue(line);
      if (kv) {
        const lowerKey = kv.key.toLowerCase();
        if (lowerKey === 'title' || lowerKey === 'name') {
          meta.name = kv.value;
        } else if (lowerKey === 'description' || lowerKey === 'desc') {
          meta.description = kv.value;
        } else if (lowerKey === 'keywords' || lowerKey === 'tags') {
          meta.keywords = kv.value.split(/[,\s]+/).filter(k => k.trim());
        }
      }
    }
  }
  
  let currentSection: 'colors' | 'typography' | 'spacing' | 'none' = 'none';
  let sectionDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
      unresolved.push(trimmed.replace(/^- \[[ x]\]\s*/, ''));
      continue;
    }
    
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const headerLevel = headerMatch[1].length;
      const headerText = headerMatch[2].toLowerCase();
      
      if (headerLevel <= sectionDepth) {
        currentSection = 'none';
      }
      
      sectionDepth = headerLevel;
      
      if (headerText.includes('color') || headerText.includes('颜色')) {
        currentSection = 'colors';
      } else if (headerText.includes('typograph') || headerText.includes('字体') || headerText.includes('文字') || headerText.includes('排版')) {
        currentSection = 'typography';
      } else if (headerText.includes('spacing') || headerText.includes('间距') || headerText.includes('space') || headerText.includes('breakpoint')) {
        currentSection = 'spacing';
      }
      
      continue;
    }
    
    const boldSectionMatch = trimmed.match(/^\*\*([^*]+)\*\*[:：]?\s*$/);
    if (boldSectionMatch) {
      const sectionText = boldSectionMatch[1].toLowerCase();
      
      if (sectionText.includes('color') || sectionText.includes('颜色')) {
        currentSection = 'colors';
      } else if (sectionText.includes('typograph') || sectionText.includes('字体') || sectionText.includes('文字') || sectionText.includes('排版')) {
        currentSection = 'typography';
      } else if (sectionText.includes('spacing') || sectionText.includes('间距') || sectionText.includes('space') || sectionText.includes('breakpoint')) {
        currentSection = 'spacing';
      }
      
      continue;
    }
    
    if (currentSection === 'none') {
      if (!meta.description && trimmed.length > 20 && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
        let descLines: string[] = [];
        let j = i;
        while (j < lines.length && !lines[j].trim().startsWith('#') && !lines[j].trim().startsWith('---')) {
          const lineText = lines[j].trim();
          if (lineText) {
            descLines.push(lineText);
          }
          if (descLines.length >= 3) break;
          j++;
        }
        meta.description = descLines.join(' ').substring(0, 200);
      }
      continue;
    }
    
    const kv = parseKeyValue(trimmed);
    if (kv) {
      const { key, value } = kv;
      
      if (currentSection === 'colors') {
        if (isValidColor(value)) {
          tokens.colors![key] = value;
        }
      } else if (currentSection === 'typography') {
        if (!isInvalidTypographyKey(key) && isLikelyTypographyValue(value)) {
          tokens.typography![key] = value;
        }
      } else if (currentSection === 'spacing') {
        if (isLikelySpacingValue(value)) {
          tokens.spacing![key] = value;
        }
      }
    }
  }
  
  return {
    meta,
    tokens,
    unresolved,
  };
};

export default function SchemaPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = parseInt(params.id as string, 10);
  
  const [schema, setSchema] = useState<Schema | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    if (isNaN(documentId)) {
      setError('无效的文档 ID');
      setIsLoading(false);
      return;
    }

    try {
      const docResponse = await fetch(`/api/documents/${documentId}`);
      const docData: ApiResponse<Document> = await docResponse.json();

      if (!docResponse.ok || !docData.success || !docData.data) {
        setError(docData.error || '获取文档失败');
        setIsLoading(false);
        return;
      }

      setDocument(docData.data);

      const schemaResponse = await fetch(`/api/documents/${documentId}/schema`);
      const schemaData: ApiResponse<Schema> = await schemaResponse.json();

      if (schemaResponse.ok && schemaData.success && schemaData.data) {
        setSchema(schemaData.data);
      } else {
        setError(schemaData.error || '获取 Schema 失败');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('获取数据失败，请稍后重试');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const handleSync = async () => {
    if (!document) return;
    
    setIsSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const parsedSchema = parseDocumentToSchema(document);
      
      const response = await fetch(`/api/documents/${documentId}/schema`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: { ...schema?.meta, ...parsedSchema.meta },
          tokens: {
            colors: { ...schema?.tokens.colors, ...parsedSchema.tokens.colors },
            typography: { ...schema?.tokens.typography, ...parsedSchema.tokens.typography },
            spacing: { ...schema?.tokens.spacing, ...parsedSchema.tokens.spacing },
          },
          unresolved: parsedSchema.unresolved && parsedSchema.unresolved.length > 0 
            ? parsedSchema.unresolved 
            : schema?.unresolved,
        }),
      });

      const data: ApiResponse<Schema> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setError(data.error || '同步失败');
        setIsSyncing(false);
        return;
      }

      setSchema(data.data);
      setSuccessMessage('同步成功！Schema 已从文档更新。');
      setIsSyncing(false);
    } catch (err) {
      console.error('Error syncing schema:', err);
      setError('同步失败，请稍后重试');
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-16">
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && isNaN(documentId)) {
    return (
      <div className="max-w-5xl mx-auto">
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

  if (!schema) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Schema 加载失败
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link
            href={`/documents/${documentId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            返回文档详情
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回文档
          </Link>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? '同步中...' : '从文档同步'}
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Schema: {document?.title || schema.meta.name || '未命名'}
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            更新于: {new Date(schema.updated_at).toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <span className="mr-2 font-medium">文档 ID:</span>
            <span>{schema.document_id}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 font-medium">Schema ID:</span>
            <span>{schema.id}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Meta 信息
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名称 (name)
            </label>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              {schema.meta.name || '<空>'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述 (description)
            </label>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 min-h-[60px]">
              {schema.meta.description || '<空>'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              关键词 (keywords)
            </label>
            <div className="flex flex-wrap gap-2">
              {schema.meta.keywords && schema.meta.keywords.length > 0 ? (
                schema.meta.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400 italic">无关键词</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tokens
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              颜色 (colors)
            </h3>
            {schema.tokens.colors && Object.keys(schema.tokens.colors).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(schema.tokens.colors).map(([key, value], index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div
                      className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: value }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{key}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">无颜色定义</p>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              排版 (typography)
            </h3>
            {schema.tokens.typography && Object.keys(schema.tokens.typography).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(schema.tokens.typography).map(([key, value], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{key}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">无排版定义</p>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              间距 (spacing)
            </h3>
            {schema.tokens.spacing && Object.keys(schema.tokens.spacing).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(schema.tokens.spacing).map(([key, value], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{key}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">无间距定义</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            未解析项 (unresolved)
          </h2>
        </div>
        <div className="p-6">
          {schema.unresolved && schema.unresolved.length > 0 ? (
            <ul className="space-y-2">
              {schema.unresolved.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">无未解析项</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            原始 JSON 数据
          </h2>
        </div>
        <div className="p-6">
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {JSON.stringify({
              meta: schema.meta,
              tokens: schema.tokens,
              unresolved: schema.unresolved,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
