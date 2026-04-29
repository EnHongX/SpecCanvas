import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { parseDesignMarkdown } from '@/lib/design-preview';
import type { ApiResponse, ErrorType, SchemaContent } from '@/lib/types';

function createErrorResponse(
  message: string,
  errorType: ErrorType,
  status: number,
  details?: string[]
): NextResponse {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
    errorType,
    details,
  };

  return NextResponse.json(response, { status });
}

function parseDocumentId(value: string): number | null {
  const documentId = Number.parseInt(value, 10);
  return Number.isNaN(documentId) ? null : documentId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseDocumentId(params.id);

    if (documentId === null) {
      return createErrorResponse('无效的文档 ID', 'validation_error', 400);
    }

    const document = await documentModel.getById(documentId);
    if (!document) {
      return createErrorResponse('文档不存在', 'validation_error', 404);
    }

    const parseResult = parseDesignMarkdown(document.raw_markdown);

    if (!parseResult.data) {
      return createErrorResponse(
        '无法从 Markdown 提取 Schema',
        'validation_error',
        400,
        parseResult.errors
      );
    }

    const colors: Record<string, string> = {};
    for (const color of parseResult.data.colors) {
      if (color.name && color.value) {
        colors[color.name] = color.value;
      }
    }

    const typography: Record<string, string> = {};
    for (const type of parseResult.data.typography) {
      if (type.name && type.value) {
        typography[type.name] = type.value;
      }
    }

    const spacing: Record<string, string> = {};
    for (const sp of parseResult.data.spacing) {
      if (sp.name && sp.value) {
        spacing[sp.name] = sp.value;
      }
    }

    const unresolved: string[] = [...parseResult.data.unresolved];

    const schemaContent: SchemaContent = {
      meta: {
        name: parseResult.data.title || document.title || '',
        description: parseResult.data.description || '',
        keywords: [],
      },
      tokens: {
        colors,
        typography,
        spacing,
      },
      unresolved,
    };

    const response: ApiResponse<typeof schemaContent> = {
      success: true,
      data: schemaContent,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error extracting schema:', error);

    return createErrorResponse(
      error instanceof Error ? error.message : '从 Markdown 提取 Schema 失败，请稍后重试',
      'server_error',
      500
    );
  }
}
