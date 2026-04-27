import { NextRequest, NextResponse } from 'next/server';
import { schemaModel } from '@/lib/models/schema';
import { documentModel } from '@/lib/models/document';
import { UpdateSchemaRequest, ApiResponse, ErrorType } from '@/lib/types';

function createErrorResponse(
  message: string, 
  errorType: ErrorType, 
  status: number
): NextResponse {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
    errorType: errorType
  };
  return NextResponse.json(response, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseInt(params.id, 10);
    
    if (isNaN(documentId)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const document = await documentModel.getById(documentId);
    if (!document) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    let schema = await schemaModel.getByDocumentId(documentId);
    
    if (!schema) {
      const defaultSchema = schemaModel.getDefaultEmptySchema(documentId);
      schema = await schemaModel.create({
        document_id: documentId,
        meta: defaultSchema.meta,
        tokens: defaultSchema.tokens,
        unresolved: defaultSchema.unresolved,
      });
    }
    
    const response: ApiResponse<typeof schema> = {
      success: true,
      data: schema
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching schema:', error);
    return createErrorResponse(
      '获取 Schema 失败，请稍后重试',
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
    const documentId = parseInt(params.id, 10);
    
    if (isNaN(documentId)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const document = await documentModel.getById(documentId);
    if (!document) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    let body: UpdateSchemaRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return createErrorResponse(
        '请求格式错误，请确保发送有效的 JSON 数据',
        'validation_error',
        400
      );
    }
    
    let schema = await schemaModel.getByDocumentId(documentId);
    
    if (!schema) {
      const defaultSchema = schemaModel.getDefaultEmptySchema(documentId);
      schema = await schemaModel.create({
        document_id: documentId,
        meta: { ...defaultSchema.meta, ...body.meta },
        tokens: { ...defaultSchema.tokens, ...body.tokens },
        unresolved: body.unresolved || defaultSchema.unresolved,
      });
    } else {
      schema = await schemaModel.update(schema.id, body);
    }
    
    if (!schema) {
      return createErrorResponse(
        '更新 Schema 失败',
        'database_error',
        500
      );
    }
    
    const response: ApiResponse<typeof schema> = {
      success: true,
      data: schema
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating schema:', error);
    return createErrorResponse(
      '更新 Schema 失败，请稍后重试',
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
    const documentId = parseInt(params.id, 10);
    
    if (isNaN(documentId)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const document = await documentModel.getById(documentId);
    if (!document) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    const existingSchema = await schemaModel.getByDocumentId(documentId);
    
    if (existingSchema) {
      const response: ApiResponse<typeof existingSchema> = {
        success: true,
        data: existingSchema
      };
      return NextResponse.json(response, { status: 200 });
    }
    
    const defaultSchema = schemaModel.getDefaultEmptySchema(documentId);
    const newSchema = await schemaModel.create({
      document_id: documentId,
      meta: defaultSchema.meta,
      tokens: defaultSchema.tokens,
      unresolved: defaultSchema.unresolved,
    });
    
    const response: ApiResponse<typeof newSchema> = {
      success: true,
      data: newSchema
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating schema:', error);
    return createErrorResponse(
      '创建 Schema 失败，请稍后重试',
      'database_error',
      500
    );
  }
}
