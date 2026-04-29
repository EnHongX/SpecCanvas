import type {
  DesignColor,
  DesignComponent,
  DesignPreviewData,
  DesignResponsive,
  DesignSpacing,
  DesignTypography,
  ParseResult,
} from './types';

type SectionKind = 'colors' | 'typography' | 'spacing' | 'unresolved' | 'components' | 'responsive' | 'other';

const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

const SECTION_KEYWORDS: Record<Exclude<SectionKind, 'other'>, string[]> = {
  colors: ['color', 'colour', 'palette', '颜色', '配色'],
  typography: ['typography', 'font', 'type', '字体', '排版'],
  spacing: ['spacing', 'space', 'gap', 'padding', 'margin', '间距', '边距'],
  unresolved: ['unresolved', 'pending', 'todo', '待确认', '待办', '待定', '需要确认'],
  components: ['component', 'button', 'card', 'input', 'navigation', 'image treatment', '组件', '按钮', '卡片', '导航'],
  responsive: ['responsive', 'breakpoint', '响应式', '断点'],
};

const COMPONENT_PROPERTY_KEYS = new Set([
  'background',
  'text',
  'border',
  'radius',
  'padding',
  'default state',
  'focus state',
  'active state',
  'used as',
  'shadow',
]);

const DEFAULT_COLORS: DesignColor[] = [
  { name: 'Action Blue', value: '#0066cc' },
  { name: 'Near-Black Ink', value: '#1d1d1f' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Parchment', value: '#f5f5f7' },
];

const DEFAULT_TYPOGRAPHY: DesignTypography[] = [
  { name: 'Hero Headline', value: '56px / 1.07 / 600' },
  { name: 'Body', value: '17px / 1.47 / 400' },
];

const DEFAULT_COMPONENTS: DesignComponent[] = [
  { name: 'Primary CTA', description: 'Primary interactive action, rendered as a prominent pill button.' },
  { name: 'Product Tile', description: 'Large visual section with headline, short copy, actions, and product-focused media.' },
];

const stripMarkdown = (value: string): string => {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
};

const normalizeHeading = (line: string): string => {
  return stripMarkdown(line)
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+(?:\.\d+)*[.)]?\s*/, '')
    .replace(/[&/]+/g, ' ')
    .trim()
    .toLowerCase();
};

const detectSectionKind = (line: string): SectionKind => {
  const normalized = normalizeHeading(line);

  for (const [kind, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return kind as SectionKind;
    }
  }

  return 'other';
};

const parseKeyValueLine = (line: string): { key: string; value: string } | null => {
  const trimmedLine = line.trim().replace(/^[-*]\s+/, '');
  const colonIndex = trimmedLine.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  const key = stripMarkdown(trimmedLine.slice(0, colonIndex));
  const value = stripMarkdown(trimmedLine.slice(colonIndex + 1));

  if (!key || !value) {
    return null;
  }

  return { key, value };
};

const parseBoldLead = (line: string): { name: string; rest: string } | null => {
  const match = line.trim().match(/^-?\s*\*\*([^*]+)\*\*\s*(?:[—-]\s*)?(.*)$/);
  if (!match) return null;

  return {
    name: stripMarkdown(match[1]),
    rest: stripMarkdown(match[2] || '').replace(/^[:：—-]\s*/, ''),
  };
};

const getHeadingText = (line: string): string | null => {
  const match = line.trim().match(/^#{2,6}\s+(.+)$/);
  return match ? stripMarkdown(match[1]) : null;
};

const extractFirstHexColor = (value: string): string | null => {
  const match = value.match(HEX_COLOR_PATTERN);
  return match?.[0] || null;
};

const isMarkdownTableRow = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
};

const isMarkdownTableSeparator = (cells: string[]): boolean => {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
};

const splitTableRow = (line: string): string[] => {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => stripMarkdown(cell));
};

const parseTable = (lines: string[], startIndex: number): { rows: string[][]; endIndex: number } => {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length && isMarkdownTableRow(lines[index])) {
    const cells = splitTableRow(lines[index]);
    if (!isMarkdownTableSeparator(cells)) {
      rows.push(cells);
    }
    index++;
  }

  return {
    rows,
    endIndex: index,
  };
};

const getSectionRanges = (lines: string[]): { kind: SectionKind; start: number; end: number }[] => {
  const ranges: { kind: SectionKind; start: number; end: number }[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].trim().startsWith('## ')) continue;

    const kind = detectSectionKind(lines[index]);
    const previous = ranges[ranges.length - 1];
    if (previous) {
      previous.end = index;
    }
    ranges.push({ kind, start: index, end: lines.length });
  }

  return ranges;
};

const parseTitle = (lines: string[]): string => {
  const titleLine = lines.find((line) => line.trim().startsWith('# '));
  return titleLine ? stripMarkdown(titleLine.trim().slice(2)) : '';
};

const parseDescription = (lines: string[]): string => {
  let paragraph: string[] = [];
  let titleSeen = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      titleSeen = true;
      continue;
    }

    if (!titleSeen || !trimmed) {
      if (paragraph.length > 0) break;
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('- ') || isMarkdownTableRow(trimmed)) {
      if (paragraph.length > 0) break;
      continue;
    }

    paragraph.push(stripMarkdown(trimmed));
    if (paragraph.join(' ').length > 240) break;
  }

  return paragraph.join(' ').trim();
};

const addUniqueColor = (colors: DesignColor[], name: string, value: string) => {
  const hex = extractFirstHexColor(value);
  if (!hex) return;

  const normalizedName = name.replace(/\([^)]*\)/g, '').trim() || hex;
  if (colors.some((color) => color.value.toLowerCase() === hex.toLowerCase())) return;

  colors.push({
    name: normalizedName,
    value: hex,
  });
};

const parseColorSection = (lines: string[]): DesignColor[] => {
  const colors: DesignColor[] = [];
  let currentGroup = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = getHeadingText(trimmed);
    if (heading) {
      currentGroup = heading;
      continue;
    }

    const boldLead = parseBoldLead(trimmed);
    if (boldLead) {
      addUniqueColor(colors, boldLead.name, `${boldLead.name} ${boldLead.rest}`);
      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      addUniqueColor(colors, kv.key, kv.value);
      continue;
    }

    const hexes = trimmed.match(HEX_COLOR_PATTERN) || [];
    for (const hex of hexes) {
      addUniqueColor(colors, currentGroup || hex, hex);
    }
  }

  return colors;
};

const parseTypographySection = (lines: string[]): DesignTypography[] => {
  const typography: DesignTypography[] = [];

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();

    if (isMarkdownTableRow(trimmed)) {
      const { rows, endIndex } = parseTable(lines, index);
      index = endIndex - 1;

      if (rows.length < 2) continue;

      const headers = rows[0].map((header) => header.toLowerCase());
      const roleIndex = headers.findIndex((header) => ['role', 'name', '用途', '角色'].some((item) => header.includes(item)));
      const sizeIndex = headers.findIndex((header) => ['size', '字号'].some((item) => header.includes(item)));
      const weightIndex = headers.findIndex((header) => ['weight', '字重'].some((item) => header.includes(item)));
      const lineHeightIndex = headers.findIndex((header) => ['line height', 'line-height', '行高'].some((item) => header.includes(item)));

      for (const row of rows.slice(1)) {
        const name = row[roleIndex >= 0 ? roleIndex : 0];
        if (!name) continue;

        const parts = [
          sizeIndex >= 0 ? row[sizeIndex] : '',
          lineHeightIndex >= 0 ? row[lineHeightIndex] : '',
          weightIndex >= 0 ? row[weightIndex] : '',
        ].filter(Boolean);

        typography.push({
          name,
          value: parts.join(' / ') || row.slice(1).filter(Boolean).join(' / '),
        });
      }

      continue;
    }

    const boldLead = parseBoldLead(trimmed);
    if (boldLead && boldLead.rest) {
      typography.push({
        name: boldLead.name,
        value: boldLead.rest,
      });
      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      typography.push({
        name: kv.key,
        value: kv.value,
      });
    }
  }

  return typography;
};

const parseSpacingSection = (lines: string[]): DesignSpacing[] => {
  const spacing: DesignSpacing[] = [];

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();

    if (isMarkdownTableRow(trimmed)) {
      const { rows, endIndex } = parseTable(lines, index);
      index = endIndex - 1;

      if (rows.length < 2) continue;

      const headers = rows[0].map((header) => header.toLowerCase());
      const nameIndex = headers.findIndex((header) => ['name', 'token', 'size', '名称', '尺寸', '变量名'].some((item) => header.includes(item)));
      const valueIndex = headers.findIndex((header) => ['value', 'px', 'rem', '值', '数值', '像素'].some((item) => header.includes(item)));

      for (const row of rows.slice(1)) {
        const name = row[nameIndex >= 0 ? nameIndex : 0];
        if (!name) continue;

        const value = valueIndex >= 0 ? row[valueIndex] : row.slice(1).filter(Boolean).join(' / ');
        if (!value) continue;

        spacing.push({
          name,
          value,
        });
      }

      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      spacing.push({
        name: kv.key,
        value: kv.value,
      });
      continue;
    }

    const boldLead = parseBoldLead(trimmed);
    if (boldLead) {
      spacing.push({
        name: boldLead.name,
        value: boldLead.rest || '',
      });
      continue;
    }
  }

  return spacing;
};

const parseUnresolvedSection = (lines: string[]): string[] => {
  const unresolved: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) continue;
    if (isMarkdownTableRow(trimmed)) continue;

    let item = trimmed;

    if (item.startsWith('- ') || item.startsWith('* ')) {
      item = item.slice(2).trim();
    } else if (item.match(/^\d+\.\s/)) {
      item = item.replace(/^\d+\.\s/, '').trim();
    }

    item = stripMarkdown(item);

    if (item) {
      unresolved.push(item);
    }
  }

  return unresolved;
};

const parseComponentSection = (lines: string[]): DesignComponent[] => {
  const components: DesignComponent[] = [];
  let currentHeading = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = getHeadingText(trimmed);

    if (heading) {
      currentHeading = heading;
      if (!components.some((component) => component.name === heading)) {
        components.push({
          name: heading,
          description: 'Design component group documented in this DESIGN.md.',
        });
      }
      continue;
    }

    const boldLead = parseBoldLead(trimmed);
    if (boldLead) {
      components.push({
        name: boldLead.name,
        description: boldLead.rest || currentHeading || 'Reusable design component.',
      });
      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      if (COMPONENT_PROPERTY_KEYS.has(kv.key.toLowerCase())) {
        continue;
      }

      components.push({
        name: kv.key,
        description: kv.value,
      });
    }
  }

  return components;
};

const parseResponsiveSection = (lines: string[]): DesignResponsive[] => {
  const responsive: DesignResponsive[] = [];

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();

    if (isMarkdownTableRow(trimmed)) {
      const { rows, endIndex } = parseTable(lines, index);
      index = endIndex - 1;

      if (rows.length < 2) continue;

      const headers = rows[0].map((header) => header.toLowerCase());
      const nameIndex = headers.findIndex((header) => ['name', 'breakpoint', '名称', '断点'].some((item) => header.includes(item)));
      const widthIndex = headers.findIndex((header) => ['width', '尺寸', '宽度'].some((item) => header.includes(item)));
      const changeIndex = headers.findIndex((header) => ['change', 'description', '说明', '变化'].some((item) => header.includes(item)));

      for (const row of rows.slice(1)) {
        const name = row[nameIndex >= 0 ? nameIndex : 0];
        if (!name) continue;

        const width = widthIndex >= 0 ? row[widthIndex] : '';
        const changes = changeIndex >= 0 ? row[changeIndex] : row.slice(1).filter(Boolean).join(' / ');

        responsive.push({
          breakpoint: width ? `${name} (${width})` : name,
          description: changes,
        });
      }

      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      responsive.push({
        breakpoint: kv.key,
        description: kv.value,
      });
    }
  }

  return responsive;
};

const extractGlobalColors = (markdown: string): DesignColor[] => {
  const colors: DesignColor[] = [];
  const matches = markdown.match(HEX_COLOR_PATTERN) || [];

  for (const hex of matches) {
    addUniqueColor(colors, hex, hex);
    if (colors.length >= 8) break;
  }

  return colors;
};

const uniqueByName = <T extends { name: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const parseDesignMarkdown = (markdown: string): ParseResult => {
  const errors: string[] = [];
  const lines = markdown.split('\n');
  const title = parseTitle(lines);
  const description = parseDescription(lines);
  const ranges = getSectionRanges(lines);

  let colors: DesignColor[] = [];
  let typography: DesignTypography[] = [];
  let spacing: DesignSpacing[] = [];
  let unresolved: string[] = [];
  let components: DesignComponent[] = [];
  let responsive: DesignResponsive[] = [];

  for (const range of ranges) {
    const sectionLines = lines.slice(range.start + 1, range.end);

    if (range.kind === 'colors') {
      colors = colors.concat(parseColorSection(sectionLines));
    }

    if (range.kind === 'typography') {
      typography = typography.concat(parseTypographySection(sectionLines));
    }

    if (range.kind === 'spacing') {
      spacing = spacing.concat(parseSpacingSection(sectionLines));
    }

    if (range.kind === 'unresolved') {
      unresolved = unresolved.concat(parseUnresolvedSection(sectionLines));
    }

    if (range.kind === 'components') {
      components = components.concat(parseComponentSection(sectionLines));
    }

    if (range.kind === 'responsive') {
      responsive = responsive.concat(parseResponsiveSection(sectionLines));
    }
  }

  colors = uniqueByName(colors).slice(0, 10);
  typography = uniqueByName(typography).slice(0, 8);
  spacing = uniqueByName(spacing).slice(0, 8);
  unresolved = Array.from(new Set(unresolved)).slice(0, 20);
  components = uniqueByName(components).slice(0, 9);
  responsive = responsive.slice(0, 8);

  if (colors.length === 0) {
    colors = extractGlobalColors(markdown).slice(0, 8);
  }

  if (!title) {
    errors.push('缺少标题。请使用 "# Title" 格式定义文档标题。');
  }

  if (!description) {
    errors.push('缺少描述。请在标题或首个设计主题区块后添加一段简短描述。');
  }

  const data: DesignPreviewData = {
    title: title || 'Untitled Design System',
    description: description || 'No description provided.',
    colors: colors.length > 0 ? colors : DEFAULT_COLORS,
    typography: typography.length > 0 ? typography : DEFAULT_TYPOGRAPHY,
    spacing,
    components: components.length > 0 ? components : DEFAULT_COMPONENTS,
    responsive,
    unresolved,
  };

  return {
    ok: errors.length === 0,
    data,
    errors,
  };
};
