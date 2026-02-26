import { strict as assert } from 'node:assert'
import { test } from './test-harness'
import { DEFAULT_STREAMING_MARKDOWN_CONFIG, resolveStreamingMarkdownConfig } from '../src/main/ets/ui/config'

test('ui:config :: returns defaults when config is empty', () => {
  const resolved = resolveStreamingMarkdownConfig()
  assert.deepEqual(resolved, DEFAULT_STREAMING_MARKDOWN_CONFIG)
})

test('ui:config :: supports feature-grouped configuration', () => {
  const resolved = resolveStreamingMarkdownConfig({
    heading: {
      sizes: [32, 28, 24, 20, 18, 16]
    },
    inline: {
      linkColor: '#0055AA'
    },
    layout: {
      contentPadding: { left: 12, right: 12 }
    },
    paragraph: {
      fontSize: 18,
      color: '#222222',
      bottomSpacing: 10
    },
    codeBlock: {
      borderColor: '#CCCCCC',
      radius: 10
    },
    blockquote: {
      bgColor: '#F3F3F3',
      bottomSpacing: 6
    },
    horizontalRule: {
      color: '#D0D0D0'
    },
    table: {
      headerBgColor: '#EFEFEF',
      stripeBgColor: '#F7F7F7',
      topSpacing: 20
    }
  })

  assert.equal(resolved.baseFontSize, 18)
  assert.deepEqual(resolved.headingSizes, [0, 32, 28, 24, 20, 18, 16])
  assert.equal(resolved.textColor, '#222222')
  assert.equal(resolved.linkColor, '#0055AA')
  assert.equal(resolved.contentPadding.left, 12)
  assert.equal(resolved.spacing.paragraphBottom, 10)
  assert.equal(resolved.spacing.tableTop, 20)
  assert.equal(resolved.spacing.blockquoteBottom, 6)
  assert.equal(resolved.codeBlockBorderColor, '#CCCCCC')
  assert.equal(resolved.codeBlockRadius, 10)
  assert.equal(resolved.blockquoteBgColor, '#F3F3F3')
  assert.equal(resolved.horizontalRuleColor, '#D0D0D0')
  assert.equal(resolved.tableHeaderBgColor, '#EFEFEF')
  assert.equal(resolved.tableStripeBgColor, '#F7F7F7')
})

test('ui:config :: supports partial grouped overrides', () => {
  const resolved = resolveStreamingMarkdownConfig({
    paragraph: { fontSize: 18, bottomSpacing: 9 }
  })

  assert.equal(resolved.baseFontSize, 18)
  assert.equal(resolved.spacing.paragraphBottom, 9)
  assert.equal(resolved.lineHeight, DEFAULT_STREAMING_MARKDOWN_CONFIG.lineHeight)
})
