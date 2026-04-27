import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { SchemaDataError, schemaModel } from '@/lib/models/schema';
import { validateSchemaContent } from '@/lib/schema-v0';
import type { ApiResponse, ErrorType, Schema } from '@/lib/types';

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

async function ensureDocumentExists(documentId: number): Promise<boolean> {
  const document = await documentModel.getById(documentId);
  return Boolean(document);
}

async function getOrCreateSchema(documentId: number): Promise<Schema> {
  const existingSchema = await schemaModel.getByDocumentId(documentId);
  if (existingSchema) {
    return existingSchema;
  }

  const defaultSchema = schemaModel.getDefaultEmptySchema(documentId);
  return await schemaModel.create({
    document_id: documentId,
    meta: defaultSchema.meta,
    tokens: defaultSchema.tokens,
    unresolved: defaultSchema.unresolved,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseDocumentId(params.id);

    if (documentId === null) {
      return createErrorResponse('无效的文档 ID', 'validation_error', 400);
    }

    if (!(await ensureDocumentExists(documentId))) {
      return createErrorResponse('文档不存在', 'validation_error', 404);
    }

    const schema = await getOrCreateSchema(documentId);
    const response: ApiResponse<typeof schema> = {
      success: true,
      data: schema,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching schema:', error);
    if (error instanceof SchemaDataError) {
      return createErrorResponse(
        'Schema 数据损坏，无法读取',
        'validation_error',
        422,
        [error.message]
      );
    }

    return createErrorResponse(
      error instanceof Error ? error.message : '获取 Schema 失败，请稍后重试',
      'database_error',
      500
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseDocumentId(params.id);

    if (documentId === null) {
      return createErrorResponse('无效的文档 ID', 'validation_error', 400);
    }

    if (!(await ensureDocumentExists(documentId))) {
      return createErrorResponse('文档不存在', 'validation_error', 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        '请求格式错误，请发送有效的 JSON',
        'validation_error',
        400,
        ['请求体不是有效 JSON，无法解析']
      );
    }

    const validation = validateSchemaContent(body);
    if (!validation.ok) {
      return createErrorResponse(
        'Schema 结构校验失败',
        'validation_error',
        400,
        validation.errors
      );
    }

    let schema = await schemaModel.getByDocumentId(documentId);

    if (!schema) {
      schema = await schemaModel.create({
        document_id: documentId,
        ...validation.value,
      });
    } else {
      schema = await schemaModel.update(schema.id, validation.value);
    }

    if (!schema) {
      return createErrorResponse(
        '保存 Schema 失败',
        'database_error',
        500,
        ['数据库更新后未能读取到 Schema 记录']
      );
    }

    const response: ApiResponse<typeof schema> = {
      success: true,
      data: schema,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating schema:', error);
    if (error instanceof SchemaDataError) {
      return createErrorResponse(
        'Schema 数据损坏，无法保存',
        'validation_error',
        422,
        [error.message]
      );
    }

    return createErrorResponse(
      error instanceof Error ? error.message : '保存 Schema 失败，请稍后重试',
      'database_error',
      500
    );
  }
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

    if (!(await ensureDocumentExists(documentId))) {
      return createErrorResponse('文档不存在', 'validation_error', 404);
    }

    const existingSchema = await schemaModel.getByDocumentId(documentId);
    if (existingSchema) {
      const response: ApiResponse<typeof existingSchema> = {
        success: true,
        data: existingSchema,
      };

      return NextResponse.json(response, { status: 200 });
    }

    const schema = await getOrCreateSchema(documentId);
    const response: ApiResponse<typeof schema> = {
      success: true,
      data: schema,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating schema:', error);
    if (error instanceof SchemaDataError) {
      return createErrorResponse(
        'Schema 数据损坏，无法创建',
        'validation_error',
        422,
        [error.message]
      );
    }

    return createErrorResponse(
      error instanceof Error ? error.message : '创建 Schema 失败，请稍后重试',
      'database_error',
      500
    );
  }
}
