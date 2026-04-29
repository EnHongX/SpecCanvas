export interface DesignToken {
  name: string;
  value: string;
}

export interface DesignColor extends DesignToken {
  category?: string;
}

export interface DesignTypography extends DesignToken {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  fontWeight?: string;
}

export interface DesignSpacing extends DesignToken {}

export interface DesignComponent {
  name: string;
  description: string;
  variants?: string[];
}

export interface DesignResponsive {
  breakpoint: string;
  description: string;
}

export interface DesignPreviewData {
  title: string;
  description: string;
  colors: DesignColor[];
  typography: DesignTypography[];
  spacing: DesignSpacing[];
  components: DesignComponent[];
  responsive: DesignResponsive[];
  unresolved: string[];
}

export interface ParseResult {
  ok: boolean;
  data?: DesignPreviewData;
  errors: string[];
}
