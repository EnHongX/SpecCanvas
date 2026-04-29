import type { Schema } from '@/lib/types';
import type { DesignPreviewData, DesignColor, DesignTypography, DesignSpacing, DesignComponent, ParseResult } from './types';

export const isSchemaReady = (schema: Schema): boolean => {
  const hasMeta = !!(schema.meta.name && schema.meta.description);
  const hasColors = Object.keys(schema.tokens.colors).length > 0;
  const hasTypography = Object.keys(schema.tokens.typography).length > 0;
  return hasMeta && hasColors && hasTypography;
};

export const schemaToDesignPreviewData = (schema: Schema): ParseResult => {
  const errors: string[] = [];

  if (!schema.meta.name) {
    errors.push('Schema 中缺少设计系统名称。请在 Schema 页面补充 meta.name。');
  }

  if (!schema.meta.description) {
    errors.push('Schema 中缺少设计系统描述。请在 Schema 页面补充 meta.description。');
  }

  const colors: DesignColor[] = Object.entries(schema.tokens.colors).map(([name, value]) => ({
    name,
    value,
  }));

  if (colors.length === 0) {
    errors.push('Schema 中缺少颜色定义。请在 Schema 页面补充 tokens.colors。');
  }

  const typography: DesignTypography[] = Object.entries(schema.tokens.typography).map(([name, value]) => ({
    name,
    value,
  }));

  if (typography.length === 0) {
    errors.push('Schema 中缺少字体定义。请在 Schema 页面补充 tokens.typography。');
  }

  const spacing: DesignSpacing[] = Object.entries(schema.tokens.spacing).map(([name, value]) => ({
    name,
    value,
  }));

  const unresolved: string[] = [...schema.unresolved];

  const components: DesignComponent[] = [];

  const data: DesignPreviewData = {
    title: schema.meta.name || '未命名设计系统',
    description: schema.meta.description || '暂无描述',
    colors: colors.length > 0 ? colors : [{ name: 'Primary', value: '#0066cc' }],
    typography: typography.length > 0 ? typography : [{ name: 'Body', value: '16px / 1.5 / 400' }],
    spacing,
    components,
    responsive: [],
    unresolved,
  };

  return {
    ok: errors.length === 0,
    data,
    errors,
  };
};

export const getSchemaReadyMessages = (): { title: string; description: string; actions: { text: string; href: string }[] } => {
  return {
    title: 'Schema 尚未配置完成',
    description: '请先在 Schema 页面填写以下信息后再查看预览：',
    actions: [
      { text: '前往 Schema 页面', href: '' },
    ],
  };
};
