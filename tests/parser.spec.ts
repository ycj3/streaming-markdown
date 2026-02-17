import { strict as assert } from 'assert'
import { BlockReducer } from '../src/main/ets/core/reducer'
import { Block } from '../src/main/ets/core/protocol'
import { parseInlineStyles } from '../src/main/ets/core/utils/inline-style-parser'
import { suite, test } from './test-harness'

type ParserCase = {
  name: string
  input: string
  expected: Block[]
}

type SegmentView = {
  content: string
  rawContent: string
  isCode: boolean
  isMath: boolean
  isMathDisplay: boolean
  isBold: boolean
  isItalic: boolean
  isStrikethrough: boolean
  isLink: boolean
  linkUrl: string
}

type InlineCase = {
  name: string
  input: string
  expected: SegmentView[]
}

function withMutedConsole<T>(fn: () => T): T {
  const original = console.log
  console.log = () => {}
  try {
    return fn()
  } finally {
    console.log = original
  }
}

function parseBlocks(input: string): Block[] {
  return withMutedConsole(() => {
    const reducer = new BlockReducer()
    for (const ch of input) {
      reducer.push(ch)
    }
    reducer.close()
    return reducer.getContext().blocks
  })
}

function toSegmentView(text: string): SegmentView[] {
  return parseInlineStyles(text).map((seg) => ({
    content: seg.content,
    rawContent: seg.rawContent,
    isCode: seg.isCode,
    isMath: seg.isMath,
    isMathDisplay: seg.isMathDisplay,
    isBold: seg.isBold,
    isItalic: seg.isItalic,
    isStrikethrough: seg.isStrikethrough,
    isLink: seg.isLink,
    linkUrl: seg.linkUrl,
  }))
}

const blockCases: ParserCase[] = [
  {
    name: 'heading level 1',
    input: '# Title\n',
    expected: [{ id: 0, type: 'heading', level: 1, text: 'Title' }],
  },
  {
    name: 'heading level 2',
    input: '## Subtitle\n',
    expected: [{ id: 0, type: 'heading', level: 2, text: 'Subtitle' }],
  },
  {
    name: 'heading level 3',
    input: '### Section\n',
    expected: [{ id: 0, type: 'heading', level: 3, text: 'Section' }],
  },
  {
    name: 'hash without heading space falls back to paragraph',
    input: '#No heading\n',
    expected: [{ id: 0, type: 'paragraph', text: '#No heading' }],
  },
  {
    name: 'single paragraph',
    input: 'hello world\n',
    expected: [{ id: 0, type: 'paragraph', text: 'hello world' }],
  },
  {
    name: 'multi paragraph split by newline',
    input: 'line1\nline2\n',
    expected: [
      { id: 0, type: 'paragraph', text: 'line1' },
      { id: 1, type: 'paragraph', text: 'line2' },
    ],
  },
  {
    name: 'paragraph keeps inline style markdown raw',
    input: '**bold** and *italic*\n',
    expected: [{ id: 0, type: 'paragraph', text: '**bold** and *italic*' }],
  },
  {
    name: 'paragraph keeps inline code raw',
    input: 'use `code` here\n',
    expected: [{ id: 0, type: 'paragraph', text: 'use `code` here' }],
  },
  {
    name: 'paragraph keeps link raw',
    input: '[OpenAI](https://openai.com)\n',
    expected: [{ id: 0, type: 'paragraph', text: '[OpenAI](https://openai.com)' }],
  },
  {
    name: 'paragraph keeps formula raw',
    input: '$x^2$ and $$\\frac{1}{2}$$\n',
    expected: [{ id: 0, type: 'paragraph', text: '$x^2$ and $$\\frac{1}{2}$$' }],
  },
  {
    name: 'code fence with language',
    input: '```ts\nconst a=1\n```\n',
    expected: [{ id: 0, type: 'code', lang: 'ts', text: 'const a=1\n' }],
  },
  {
    name: 'code fence without language',
    input: '```\nplain\n```\n',
    expected: [{ id: 0, type: 'code', text: 'plain\n' }],
  },
  {
    name: 'unclosed code fence is flushed on close',
    input: '```js\nconsole.log(1)\n',
    expected: [{ id: 0, type: 'code', lang: 'js', text: 'console.log(1)\n' }],
  },
  {
    name: 'unordered list item',
    input: '- item\n',
    expected: [{ id: 0, type: 'listItem', text: ' item' }],
  },
  {
    name: 'task list unchecked',
    input: '- [ ] todo\n',
    expected: [{ id: 0, type: 'taskListItem', checked: false, text: 'todo' }],
  },
  {
    name: 'task list checked',
    input: '- [x] done\n',
    expected: [{ id: 0, type: 'taskListItem', checked: true, text: 'done' }],
  },
  {
    name: 'ordered list multi items',
    input: '1. one\n2. two\n',
    expected: [
      { id: 0, type: 'orderedListItem', number: 1, text: 'one' },
      { id: 1, type: 'orderedListItem', number: 2, text: 'two' },
    ],
  },
  {
    name: 'blockquote',
    input: '> quote\n',
    expected: [{ id: 0, type: 'blockquote', text: 'quote' }],
  },
  {
    name: 'horizontal rule',
    input: '---\n',
    expected: [{ id: 0, type: 'horizontalRule', text: '' }],
  },
  {
    name: 'basic table',
    input: '| h1 | h2 |\n| --- | --- |\n| a | b |\n\n',
    expected: [
      {
        id: 0,
        type: 'table',
        headers: ['h1', 'h2'],
        alignments: [null, null],
        rows: [['a', 'b']],
        version: 0,
        text: '',
      },
    ],
  },
  {
    name: 'table alignment parsing',
    input: '| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |\n\n',
    expected: [
      {
        id: 0,
        type: 'table',
        headers: ['a', 'b', 'c'],
        alignments: ['left', 'center', 'right'],
        rows: [['1', '2', '3']],
        version: 0,
        text: '',
      },
    ],
  },
  {
    name: 'table exits on empty line then parse next paragraph',
    input: '| h1 | h2 |\n| --- | --- |\n| a | b |\n\nafter\n',
    expected: [
      {
        id: 0,
        type: 'table',
        headers: ['h1', 'h2'],
        alignments: [null, null],
        rows: [['a', 'b']],
        version: 0,
        text: '',
      },
      { id: 1, type: 'paragraph', text: 'after' },
    ],
  },
]

const inlineCases: InlineCase[] = [
  {
    name: 'plain text segment',
    input: 'plain text',
    expected: [
      {
        content: 'plain text',
        rawContent: 'plain text',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'bold segment',
    input: '**bold**',
    expected: [
      {
        content: 'bold',
        rawContent: 'bold',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: true,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'italic segment',
    input: '*italic*',
    expected: [
      {
        content: 'italic',
        rawContent: 'italic',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: true,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'strikethrough segment',
    input: '~~del~~',
    expected: [
      {
        content: 'del',
        rawContent: 'del',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: true,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'inline code segment',
    input: '`code`',
    expected: [
      {
        content: 'code',
        rawContent: 'code',
        isCode: true,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'link segment',
    input: '[OpenAI](https://openai.com)',
    expected: [
      {
        content: 'OpenAI',
        rawContent: 'OpenAI',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: true,
        linkUrl: 'https://openai.com',
      },
    ],
  },
  {
    name: 'inline math segment',
    input: '$x^2$',
    expected: [
      {
        content: 'x²',
        rawContent: 'x^2',
        isCode: false,
        isMath: true,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'display math segment',
    input: '$$\\frac{1}{2}$$',
    expected: [
      {
        content: '(1)/(2)',
        rawContent: '\\frac{1}{2}',
        isCode: false,
        isMath: true,
        isMathDisplay: true,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'double dollar inside sentence is inline math',
    input: 'inline $$x$$ math',
    expected: [
      {
        content: 'inline ',
        rawContent: 'inline ',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: 'x',
        rawContent: 'x',
        isCode: false,
        isMath: true,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: ' math',
        rawContent: ' math',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'bold and italic nesting via triple stars',
    input: '***bi***',
    expected: [
      {
        content: 'bi',
        rawContent: 'bi',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: true,
        isItalic: true,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'segment merge for adjacent plain text',
    input: 'ab',
    expected: [
      {
        content: 'ab',
        rawContent: 'ab',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
  {
    name: 'mixed style link and math segmentation',
    input: 'mix **b** and [l](u) and $x$',
    expected: [
      {
        content: 'mix ',
        rawContent: 'mix ',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: 'b',
        rawContent: 'b',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: true,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: ' and ',
        rawContent: ' and ',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: 'l',
        rawContent: 'l',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: true,
        linkUrl: 'u',
      },
      {
        content: ' and ',
        rawContent: ' and ',
        isCode: false,
        isMath: false,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
      {
        content: 'x',
        rawContent: 'x',
        isCode: false,
        isMath: true,
        isMathDisplay: false,
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isLink: false,
        linkUrl: '',
      },
    ],
  },
]

suite('parser:block reducer', () => {
  for (const item of blockCases) {
    test(item.name, () => {
      assert.deepEqual(parseBlocks(item.input), item.expected)
    })
  }
})

suite('parser:inline style parser', () => {
  for (const item of inlineCases) {
    test(item.name, () => {
      assert.deepEqual(toSegmentView(item.input), item.expected)
    })
  }
})

suite('parser:guardrail', () => {
  test('has at least 30 parser samples', () => {
    const total = blockCases.length + inlineCases.length
    assert.ok(total >= 30, `parser sample count should be >= 30, got ${total}`)
  })
})
