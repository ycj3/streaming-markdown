export interface MarkdownContentPaddingConfig {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export interface MarkdownHeadingConfig {
  sizes?: number[]
  color?: string
  topSpacing?: number
  bottomSpacing?: number
}

export interface MarkdownParagraphConfig {
  fontSize?: number
  lineHeight?: number
  fontFamily?: string
  color?: string
  secondaryColor?: string
  bottomSpacing?: number
}

export interface MarkdownListConfig {
  fontSize?: number
  lineHeight?: number
  color?: string
  itemBottomSpacing?: number
}

export interface MarkdownBlockquoteConfig {
  textColor?: string
  bgColor?: string
  borderColor?: string
  bottomSpacing?: number
}

export interface MarkdownCodeBlockConfig {
  borderColor?: string
  radius?: number
  topSpacing?: number
  bottomSpacing?: number
}

export interface MarkdownTableConfig {
  headerBgColor?: string
  borderColor?: string
  stripeBgColor?: string
  cellFontSize?: number
  topSpacing?: number
  bottomSpacing?: number
}

export interface MarkdownHorizontalRuleConfig {
  color?: string
  topSpacing?: number
  bottomSpacing?: number
}

export interface MarkdownInlineConfig {
  linkColor?: string
  codeTextColor?: string
  codeBgColor?: string
  mathTextColor?: string
  mathBgColor?: string
  monoFontFamily?: string
}

export interface MarkdownLayoutConfig {
  contentPadding?: MarkdownContentPaddingConfig
  fontFamily?: string
}

export interface StreamingMarkdownConfig {
  heading?: MarkdownHeadingConfig
  paragraph?: MarkdownParagraphConfig
  list?: MarkdownListConfig
  blockquote?: MarkdownBlockquoteConfig
  codeBlock?: MarkdownCodeBlockConfig
  table?: MarkdownTableConfig
  horizontalRule?: MarkdownHorizontalRuleConfig
  inline?: MarkdownInlineConfig
  layout?: MarkdownLayoutConfig
}

export interface StreamingMarkdownResolvedConfig {
  baseFontSize: number
  smallFontSize: number
  lineHeight: number
  fontFamily: string
  monoFontFamily: string
  headingSizes: number[]
  textColor: string
  secondaryTextColor: string
  headingColor: string
  linkColor: string
  inlineCodeTextColor: string
  inlineCodeBgColor: string
  inlineMathTextColor: string
  inlineMathBgColor: string
  codeBlockBorderColor: string
  codeBlockRadius: number
  blockquoteTextColor: string
  blockquoteBgColor: string
  blockquoteBorderColor: string
  horizontalRuleColor: string
  tableHeaderBgColor: string
  tableBorderColor: string
  tableStripeBgColor: string
  contentPadding: {
    left: number
    right: number
    top: number
    bottom: number
  }
  spacing: {
    headingTop: number
    headingBottom: number
    paragraphBottom: number
    listItemBottom: number
    blockquoteBottom: number
    codeBlockTop: number
    codeBlockBottom: number
    tableTop: number
    tableBottom: number
    horizontalRuleTop: number
    horizontalRuleBottom: number
  }
}

export const DEFAULT_STREAMING_MARKDOWN_CONFIG: StreamingMarkdownResolvedConfig = {
  baseFontSize: 16,
  smallFontSize: 14,
  lineHeight: 24,
  fontFamily: 'sans-serif',
  monoFontFamily: 'monospace',
  headingSizes: [0, 28, 24, 20, 18, 16, 14],
  textColor: '#333333',
  secondaryTextColor: '#666666',
  headingColor: '#1A1A1A',
  linkColor: '#1976D2',
  inlineCodeTextColor: '#D32F2F',
  inlineCodeBgColor: '#F5F5F5',
  inlineMathTextColor: '#0D47A1',
  inlineMathBgColor: '#EEF3FF',
  codeBlockBorderColor: '#E5E5E5',
  codeBlockRadius: 12,
  blockquoteTextColor: '#666666',
  blockquoteBgColor: '#F9F9F9',
  blockquoteBorderColor: '#E0E0E0',
  horizontalRuleColor: '#E0E0E0',
  tableHeaderBgColor: '#F5F5F5',
  tableBorderColor: '#E0E0E0',
  tableStripeBgColor: '#FAFAFA',
  contentPadding: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
  spacing: {
    headingTop: 12,
    headingBottom: 8,
    paragraphBottom: 8,
    listItemBottom: 4,
    blockquoteBottom: 8,
    codeBlockTop: 16,
    codeBlockBottom: 16,
    tableTop: 12,
    tableBottom: 12,
    horizontalRuleTop: 16,
    horizontalRuleBottom: 16
  }
}

function mergeHeadingSizes(source?: number[]): number[] {
  const merged = [...DEFAULT_STREAMING_MARKDOWN_CONFIG.headingSizes]
  if (!source || source.length === 0) {
    return merged
  }

  if (source.length === 6) {
    let level = 1
    while (level <= 6) {
      if (typeof source[level - 1] === 'number') {
        merged[level] = source[level - 1] as number
      }
      level += 1
    }
    return merged
  }

  let index = 1
  while (index <= 6) {
    if (typeof source[index] === 'number') {
      merged[index] = source[index] as number
    }
    index += 1
  }

  return merged
}

export function resolveStreamingMarkdownConfig(config?: StreamingMarkdownConfig): StreamingMarkdownResolvedConfig {
  const base = DEFAULT_STREAMING_MARKDOWN_CONFIG
  const source = config || {}

  return {
    baseFontSize: source.paragraph?.fontSize ?? source.list?.fontSize ?? base.baseFontSize,
    smallFontSize: source.table?.cellFontSize ?? base.smallFontSize,
    lineHeight: source.paragraph?.lineHeight ?? source.list?.lineHeight ?? base.lineHeight,
    fontFamily: source.paragraph?.fontFamily ?? source.layout?.fontFamily ?? base.fontFamily,
    monoFontFamily: source.inline?.monoFontFamily ?? base.monoFontFamily,
    headingSizes: mergeHeadingSizes(source.heading?.sizes),
    textColor: source.paragraph?.color ?? source.list?.color ?? base.textColor,
    secondaryTextColor: source.paragraph?.secondaryColor ?? base.secondaryTextColor,
    headingColor: source.heading?.color ?? base.headingColor,
    linkColor: source.inline?.linkColor ?? base.linkColor,
    inlineCodeTextColor: source.inline?.codeTextColor ?? base.inlineCodeTextColor,
    inlineCodeBgColor: source.inline?.codeBgColor ?? base.inlineCodeBgColor,
    inlineMathTextColor: source.inline?.mathTextColor ?? base.inlineMathTextColor,
    inlineMathBgColor: source.inline?.mathBgColor ?? base.inlineMathBgColor,
    codeBlockBorderColor: source.codeBlock?.borderColor ?? base.codeBlockBorderColor,
    codeBlockRadius: source.codeBlock?.radius ?? base.codeBlockRadius,
    blockquoteTextColor: source.blockquote?.textColor ?? base.blockquoteTextColor,
    blockquoteBgColor: source.blockquote?.bgColor ?? base.blockquoteBgColor,
    blockquoteBorderColor: source.blockquote?.borderColor ?? base.blockquoteBorderColor,
    horizontalRuleColor: source.horizontalRule?.color ?? base.horizontalRuleColor,
    tableHeaderBgColor: source.table?.headerBgColor ?? base.tableHeaderBgColor,
    tableBorderColor: source.table?.borderColor ?? base.tableBorderColor,
    tableStripeBgColor: source.table?.stripeBgColor ?? base.tableStripeBgColor,
    contentPadding: {
      left: source.layout?.contentPadding?.left ?? base.contentPadding.left,
      right: source.layout?.contentPadding?.right ?? base.contentPadding.right,
      top: source.layout?.contentPadding?.top ?? base.contentPadding.top,
      bottom: source.layout?.contentPadding?.bottom ?? base.contentPadding.bottom
    },
    spacing: {
      headingTop: source.heading?.topSpacing ?? base.spacing.headingTop,
      headingBottom: source.heading?.bottomSpacing ?? base.spacing.headingBottom,
      paragraphBottom: source.paragraph?.bottomSpacing ?? base.spacing.paragraphBottom,
      listItemBottom: source.list?.itemBottomSpacing ?? base.spacing.listItemBottom,
      blockquoteBottom: source.blockquote?.bottomSpacing ?? base.spacing.blockquoteBottom,
      codeBlockTop: source.codeBlock?.topSpacing ?? base.spacing.codeBlockTop,
      codeBlockBottom: source.codeBlock?.bottomSpacing ?? base.spacing.codeBlockBottom,
      tableTop: source.table?.topSpacing ?? base.spacing.tableTop,
      tableBottom: source.table?.bottomSpacing ?? base.spacing.tableBottom,
      horizontalRuleTop: source.horizontalRule?.topSpacing ?? base.spacing.horizontalRuleTop,
      horizontalRuleBottom: source.horizontalRule?.bottomSpacing ?? base.spacing.horizontalRuleBottom
    }
  }
}
