import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { typeModel } from '@/lib/models/type';
import { UpdateDocumentRequest, ApiResponse, ErrorType } from '@/lib/types';

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
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const document = await documentModel.getById(id);
    
    if (!document) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    const response: ApiResponse<typeof document> = {
      success: true,
      data: document
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return createErrorResponse(
      '获取文档失败，请稍后重试',
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
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const body: UpdateDocumentRequest = await request.json();
    
    if (body.type_id !== undefined && body.type_id !== null) {
      const type = await typeModel.getById(body.type_id);
      if (!type) {
        return createErrorResponse(
          '指定的类型不存在',
          'validation_error',
          400
        );
      }
    }
    
    const updatedDocument = await documentModel.update(id, body);
    
    if (!updatedDocument) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    return createErrorResponse(
      '更新文档失败，请稍后重试',
      'database_error',
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return createErrorResponse(
        '无效的文档 ID',
        'validation_error',
        400
      );
    }
    
    const success = await documentModel.delete(id);
    
    if (!success) {
      return createErrorResponse(
        '文档不存在',
        'validation_error',
        404
      );
    }
    
    const response: ApiResponse<null> = {
      success: true
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return createErrorResponse(
      '删除文档失败，请稍后重试',
      'database_error',
      500
    );
  }
}
