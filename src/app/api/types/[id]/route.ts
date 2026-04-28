import { NextRequest, NextResponse } from 'next/server';
import { typeModel } from '@/lib/models/type';
import { UpdateDocumentTypeRequest, ApiResponse, ErrorType } from '@/lib/types';

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
        '无效的类型 ID',
        'validation_error',
        400
      );
    }
    
    const type = await typeModel.getById(id);
    
    if (!type) {
      return createErrorResponse(
        '类型不存在',
        'validation_error',
        404
      );
    }
    
    const response: ApiResponse<typeof type> = {
      success: true,
      data: type
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching document type:', error);
    return createErrorResponse(
      '获取类型失败，请稍后重试',
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
        '无效的类型 ID',
        'validation_error',
        400
      );
    }
    
    const existingType = await typeModel.getById(id);
    if (!existingType) {
      return createErrorResponse(
        '类型不存在',
        'validation_error',
        404
      );
    }
    
    let body: UpdateDocumentTypeRequest;
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
    
    if (body.name !== undefined) {
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
      
      const existingTypes = await typeModel.getAll();
      const nameExists = existingTypes.some(
        t => t.id !== id && t.name.toLowerCase() === body.name!.toLowerCase()
      );
      if (nameExists) {
        return createErrorResponse(
          '类型名称已存在',
          'validation_error',
          400
        );
      }
    }
    
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return createErrorResponse(
        '颜色格式无效，必须是 6 位十六进制颜色代码（如 #3B82F6）',
        'validation_error',
        400
      );
    }
    
    const updateData: UpdateDocumentTypeRequest = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim() || '';
    if (body.color !== undefined) updateData.color = body.color;
    
    const updatedType = await typeModel.update(id, updateData);
    
    if (!updatedType) {
      return createErrorResponse(
        '更新类型失败',
        'database_error',
        500
      );
    }
    
    const response: ApiResponse<typeof updatedType> = {
      success: true,
      data: updatedType
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating document type:', error);
    return createErrorResponse(
      '更新类型时发生未知错误，请稍后重试',
      'server_error',
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
        '无效的类型 ID',
        'validation_error',
        400
      );
    }
    
    const existingType = await typeModel.getById(id);
    if (!existingType) {
      return createErrorResponse(
        '类型不存在',
        'validation_error',
        404
      );
    }
    
    const success = await typeModel.delete(id);
    
    if (!success) {
      return createErrorResponse(
        '无法删除该类型，因为还有文档绑定了此类型',
        'validation_error',
        400
      );
    }
    
    const response: ApiResponse<null> = {
      success: true
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error deleting document type:', error);
    return createErrorResponse(
      '删除类型时发生未知错误，请稍后重试',
      'server_error',
      500
    );
  }
}
