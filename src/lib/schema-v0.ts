import type { SchemaContent, SchemaMeta, SchemaTokens } from './types';

export const SCHEMA_V0_TOKEN_KEYS = ['colors', 'typography', 'spacing'] as const;

type StringRecord = Record<string, string>;

export interface SchemaValidationSuccess {
  ok: true;
  value: SchemaContent;
}

export interface SchemaValidationFailure {
  ok: false;
  errors: string[];
}

export type SchemaValidationResult = SchemaValidationSuccess | SchemaValidationFailure;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const getDefaultSchemaMeta = (): SchemaMeta => ({
  name: '',
  description: '',
  keywords: [],
});

export const getDefaultSchemaTokens = (): SchemaTokens => ({
  colors: {},
  typography: {},
  spacing: {},
});

export const getDefaultSchemaContent = (): SchemaContent => ({
  meta: getDefaultSchemaMeta(),
  tokens: getDefaultSchemaTokens(),
  unresolved: [],
});

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeStringRecord = (value: unknown): StringRecord => {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      const [key, itemValue] = entry;
      return key.trim().length > 0 && typeof itemValue === 'string';
    })
  );
};

export const normalizeSchemaContent = (value: unknown): SchemaContent => {
  const input = isPlainObject(value) ? value : {};
  const meta = isPlainObject(input.meta) ? input.meta : {};
  const tokens = isPlainObject(input.tokens) ? input.tokens : {};

  return {
    meta: {
      name: typeof meta.name === 'string' ? meta.name : '',
      description: typeof meta.description === 'string' ? meta.description : '',
      keywords: normalizeStringArray(meta.keywords),
    },
    tokens: {
      colors: normalizeStringRecord(tokens.colors),
      typography: normalizeStringRecord(tokens.typography),
      spacing: normalizeStringRecord(tokens.spacing),
    },
    unresolved: normalizeStringArray(input.unresolved),
  };
};

const validateStringRecord = (
  value: unknown,
  fieldName: string,
  errors: string[]
): StringRecord => {
  if (!isPlainObject(value)) {
    errors.push(`${fieldName} 必须是对象，例如 {"primary":"#000000"}`);
    return {};
  }

  const result: StringRecord = {};

  for (const [key, itemValue] of Object.entries(value)) {
    if (key.trim().length === 0) {
      errors.push(`${fieldName} 不能包含空 key`);
      continue;
    }

    if (typeof itemValue !== 'string') {
      errors.push(`${fieldName}.${key} 必须是字符串`);
      continue;
    }

    result[key] = itemValue;
  }

  return result;
};

export const validateSchemaContent = (value: unknown): SchemaValidationResult => {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: ['Schema 必须是 JSON 对象'],
    };
  }

  if (!('meta' in value)) {
    errors.push('缺少 meta 对象');
  }

  if (!('tokens' in value)) {
    errors.push('缺少 tokens 对象');
  }

  if (!('unresolved' in value)) {
    errors.push('缺少 unresolved 数组');
  }

  const meta = value.meta;
  const tokens = value.tokens;
  const unresolved = value.unresolved;

  const validatedMeta: SchemaMeta = getDefaultSchemaMeta();
  const validatedTokens: SchemaTokens = getDefaultSchemaTokens();

  if (isPlainObject(meta)) {
    if (typeof meta.name === 'string') {
      validatedMeta.name = meta.name;
    } else {
      errors.push('meta.name 必须是字符串');
    }

    if (typeof meta.description === 'string') {
      validatedMeta.description = meta.description;
    } else {
      errors.push('meta.description 必须是字符串');
    }

    if (Array.isArray(meta.keywords) && meta.keywords.every((item) => typeof item === 'string')) {
      validatedMeta.keywords = meta.keywords;
    } else {
      errors.push('meta.keywords 必须是字符串数组');
    }
  } else if ('meta' in value) {
    errors.push('meta 必须是对象');
  }

  if (isPlainObject(tokens)) {
    const unsupportedTokenKeys = Object.keys(tokens).filter(
      (key) => !SCHEMA_V0_TOKEN_KEYS.includes(key as (typeof SCHEMA_V0_TOKEN_KEYS)[number])
    );

    if (unsupportedTokenKeys.length > 0) {
      errors.push(`tokens 只支持 colors、typography、spacing，不支持：${unsupportedTokenKeys.join('、')}`);
    }

    for (const key of SCHEMA_V0_TOKEN_KEYS) {
      if (!(key in tokens)) {
        errors.push(`缺少 tokens.${key} 对象`);
        continue;
      }

      validatedTokens[key] = validateStringRecord(tokens[key], `tokens.${key}`, errors);
    }
  } else if ('tokens' in value) {
    errors.push('tokens 必须是对象');
  }

  let validatedUnresolved: string[] = [];

  if (Array.isArray(unresolved) && unresolved.every((item) => typeof item === 'string')) {
    validatedUnresolved = unresolved;
  } else if ('unresolved' in value) {
    errors.push('unresolved 必须是字符串数组');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      meta: validatedMeta,
      tokens: validatedTokens,
      unresolved: validatedUnresolved,
    },
  };
};
