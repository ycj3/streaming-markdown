export type ParagraphBlock = {
  id: number
  type: 'paragraph'
  text: string
}

export type CodeBlock = {
  id: number
  type: 'code'
  lang?: string
  text: string
}

export type HeadingBlock = {
  id: number
  type: 'heading'
  level: number // 1 for #, 2 for ##, etc.
  text: string
}

export type InlineCodeBlock = {
  id: number
  type: 'inlineCode'
  text: string
}

export type ListItemBlock = {
  id: number
  type: 'listItem'
  text: string
}

export type TaskListItemBlock = {
  id: number
  type: 'taskListItem'
  checked: boolean  // true for [x], false for [ ]
  text: string
}

export type OrderedListItemBlock = {
  id: number
  type: 'orderedListItem'
  number: number  // 1, 2, 3, etc.
  text: string
}

export type BlockquoteBlock = {
  id: number
  type: 'blockquote'
  text: string
}

export type HorizontalRuleBlock = {
  id: number
  type: 'horizontalRule'
  text: ''  // Empty text, for type compatibility
}

export class TextSegment {
  content: string = ""
  isCode: boolean = false
  isBold: boolean = false
  isItalic: boolean = false
  isStrikethrough: boolean = false
  isLink: boolean = false
  linkUrl: string = ""
}

export type Block = ParagraphBlock | CodeBlock | HeadingBlock | InlineCodeBlock | ListItemBlock | OrderedListItemBlock | TaskListItemBlock | BlockquoteBlock | HorizontalRuleBlock

export type BlockDiff =
  | { kind: 'append'; block: Block }
    | { kind: 'patch'; id: number; block: Block }
