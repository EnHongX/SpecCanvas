import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { CreateDocumentRequest, ApiResponse } from '@/lib/types';

// GET /api/documents - 获取文档列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
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
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch documents'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/documents - 创建新文档
export async function POST(request: NextRequest) {
  try {
    const body: CreateDocumentRequest = await request.json();
    
    // 验证必填字段
    if (!body.title || !body.source_type || !body.raw_markdown) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing required fields: title, source_type, and raw_markdown are required'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // 验证 source_type
    if (body.source_type !== 'file' && body.source_type !== 'paste') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid source_type. Must be either "file" or "paste"'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // 验证 status（如果提供）
    if (body.status && !['draft', 'published', 'archived'].includes(body.status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid status. Must be one of: draft, published, archived'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const document = await documentModel.create({
      title: body.title,
      source_type: body.source_type,
      raw_markdown: body.raw_markdown,
      status: body.status
    });
    
    const response: ApiResponse<typeof document> = {
      success: true,
      data: document
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create document'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
