import { NextRequest, NextResponse } from 'next/server';
import { typeModel } from '@/lib/models/type';
import { CreateDocumentTypeRequest, ApiResponse, ErrorType } from '@/lib/types';

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

export async function GET(request: NextRequest) {
  try {
    const types = await typeModel.getAll();
    
    const response: ApiResponse<{ types: typeof types }> = {
      success: true,
      data: {
        types
      }
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return createErrorResponse(
      '获取类型列表失败，请稍后重试',
      'database_error',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: CreateDocumentTypeRequest;
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
    
    if (!body.name) {
      return createErrorResponse(
        '类型名称不能为空',
        'validation_error',
        400
      );
    }
    
    if (body.name.trim().length === 0) {
      return createErrorResponse(
        '类型名称不能为空或仅包含空格',
        'validation_error',
        400
      );
    }
    
    if (body.name.length > 50) {
      return createErrorResponse(
        '类型名称长度不能超过 50 个字符',
        'validation_error',
        400
      );
    }
    
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return createErrorResponse(
        '颜色格式无效，必须是 6 位十六进制颜色代码（如 #3B82F6）',
        'validation_error',
        400
      );
    }
    
    const existingTypes = await typeModel.getAll();
    const nameExists = existingTypes.some(t => t.name.toLowerCase() === body.name.toLowerCase());
    if (nameExists) {
      return createErrorResponse(
        '类型名称已存在',
        'validation_error',
        400
      );
    }
    
    const type = await typeModel.create({
      name: body.name.trim(),
      description: body.description?.trim() || '',
      color: body.color || '#3B82F6'
    });
    
    const response: ApiResponse<typeof type> = {
      success: true,
      data: type
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating document type:', error);
    return createErrorResponse(
      '创建类型时发生未知错误，请稍后重试',
      'server_error',
      500
    );
  }
}
