import { documentModel } from '@/lib/models/document';
import { parseDesignMarkdown } from '@/lib/design-preview';
import { DesignPreview } from '@/components/DesignPreview';
import { notFound } from 'next/navigation';

interface PreviewPageProps {
  params: {
    id: string;
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const id = parseInt(params.id, 10);
  
  if (isNaN(id)) {
    notFound();
  }
  
  let document = null;
  
  try {
    document = await documentModel.getById(id);
  } catch (error) {
    console.error('Error fetching document:', error);
  }
  
  if (!document) {
    notFound();
  }
  
  const parseResult = parseDesignMarkdown(document.raw_markdown);

  return <DesignPreview parseResult={parseResult} />;
}
