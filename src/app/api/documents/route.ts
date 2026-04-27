import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { CreateDocumentRequest, ApiResponse, ErrorType } from '@/lib/types';

// 创建错误响应的辅助函数
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

// GET /api/documents - 获取文档列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // 验证分页参数
    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return createErrorResponse(
        '无效的分页参数。limit 必须是 1-100 之间的整数',
        'validation_error',
        400
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return createErrorResponse(
        '无效的分页参数。offset 必须是非负整数',
        'validation_error',
        400
      );
    }
    
    const documents = await documentModel.getAll(limit, offset);
    const total = await documentModel.count();
    
    const response: ApiResponse<{ documents: typeof documents; total: number }> = {
      success: true,
      data: {
        documents,
        total
      }
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return createErrorResponse(
      '获取文档列表失败，请稍后重试',
      'database_error',
      500
    );
  }
}

// POST /api/documents - 创建新文档
export async function POST(request: NextRequest) {
  try {
    // 尝试解析请求体
    let body: CreateDocumentRequest;
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
    
    // 验证必填字段
    const missingFields: string[] = [];
    if (!body.title) missingFields.push('title');
    if (!body.source_type) missingFields.push('source_type');
    if (!body.raw_markdown) missingFields.push('raw_markdown');
    
    if (missingFields.length > 0) {
      return createErrorResponse(
        `缺少必填字段: ${missingFields.join(', ')}`,
        'validation_error',
        400
      );
    }
    
    // 验证 source_type
    if (body.source_type !== 'file' && body.source_type !== 'paste') {
      return createErrorResponse(
        '无效的 source_type。必须是 "file" 或 "paste"',
        'validation_error',
        400
      );
    }
    
    // 验证 status（如果提供）
    if (body.status && !['draft', 'published', 'archived'].includes(body.status)) {
      return createErrorResponse(
        '无效的 status。必须是: draft, published, archived 中的一个',
        'validation_error',
        400
      );
    }
    
    // 验证标题长度
    if (body.title.trim().length === 0) {
      return createErrorResponse(
        '标题不能为空或仅包含空格',
        'validation_error',
        400
      );
    }
    
    if (body.title.length > 200) {
      return createErrorResponse(
        '标题长度不能超过 200 个字符',
        'validation_error',
        400
      );
    }
    
    // 验证 Markdown 内容
    if (body.raw_markdown.trim().length === 0) {
      return createErrorResponse(
        'Markdown 内容不能为空或仅包含空格',
        'validation_error',
        400
      );
    }
    
    // 限制内容大小（例如 10MB）
    const maxContentSize = 10 * 1024 * 1024; // 10MB
    if (new Blob([body.raw_markdown]).size > maxContentSize) {
      return createErrorResponse(
        'Markdown 内容过大，最大允许 10MB',
        'validation_error',
        400
      );
    }
    
    // 创建文档
    let document;
    try {
      document = await documentModel.create({
        title: body.title.trim(),
        source_type: body.source_type,
        raw_markdown: body.raw_markdown,
        status: body.status
      });
    } catch (dbError) {
      console.error('Database error creating document:', dbError);
      return createErrorResponse(
        '数据库操作失败，无法创建文档',
        'database_error',
        500
      );
    }
    
    const response: ApiResponse<typeof document> = {
      success: true,
      data: document
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating document:', error);
    return createErrorResponse(
      '创建文档时发生未知错误，请稍后重试',
      'server_error',
      500
    );
  }
}
