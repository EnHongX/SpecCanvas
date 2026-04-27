import { NextRequest, NextResponse } from 'next/server';
import { documentModel } from '@/lib/models/document';
import { UpdateDocumentRequest, ApiResponse } from '@/lib/types';

// GET /api/documents/[id] - 获取单个文档
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid document ID'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const document = await documentModel.getById(id);
    
    if (!document) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<typeof document> = {
      success: true,
      data: document
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch document'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/documents/[id] - 更新文档
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid document ID'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const body: UpdateDocumentRequest = await request.json();
    
    // 验证 status（如果提供）
    if (body.status && !['draft', 'published', 'archived'].includes(body.status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid status. Must be one of: draft, published, archived'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const updatedDocument = await documentModel.update(id, body);
    
    if (!updatedDocument) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<typeof updatedDocument> = {
      success: true,
      data: updatedDocument
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update document'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/documents/[id] - 删除文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid document ID'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const success = await documentModel.delete(id);
    
    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<null> = {
      success: true
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete document'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
