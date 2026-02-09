import { TextSegment } from "../protocol";

/**
 * TokenType for internal parsing logic
 */
enum TokenType {
  TEXT = "text",
  BOLD_OPEN = "bold_open",
  BOLD_CLOSE = "bold_close",
  ITALIC_OPEN = "italic_open",
  ITALIC_CLOSE = "italic_close",
  STRIKETHROUGH_OPEN = "strike_open",
  STRIKETHROUGH_CLOSE = "strike_close",
  CODE = "code",
  LINK_TEXT = "link_text",
  LINK_URL = "link_url",
}

interface Token {
  type: TokenType;
  value: string;
  url?: string;
}

class Tokenizer {
  private text: string;
  private pos: number = 0;
  private isBoldOpen = false;
  private isItalicOpen = false;
  private isStrikeOpen = false;

  constructor(text: string) {
    this.text = text;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.text.length) {
      const char = this.text[this.pos];
      const next = this.text[this.pos + 1];

      // 1. Inline Code: Highest priority.
      // Content inside backticks is treated as literal text (verbatim).
      if (char === "`") {
        const endIdx = this.text.indexOf("`", this.pos + 1);
        if (endIdx !== -1) {
          tokens.push({
            type: TokenType.CODE,
            value: this.text.substring(this.pos + 1, endIdx),
          });
          this.pos = endIdx + 1;
          continue;
        }
      }

      // 2. Link: [text](url)
      if (char === "[") {
        const linkEnd = this.parseLink();
        if (linkEnd) {
          tokens.push({
            type: TokenType.LINK_TEXT,
            value: linkEnd.text,
            url: linkEnd.url,
          });
          this.pos = linkEnd.newPos;
          continue;
        }
      }

      // 3. Strikethrough: Handles double tildes ~~
      if (char === "~" && next === "~") {
        this.isStrikeOpen = !this.isStrikeOpen;
        tokens.push({
          type: this.isStrikeOpen
            ? TokenType.STRIKETHROUGH_OPEN
            : TokenType.STRIKETHROUGH_CLOSE,
          value: "~~",
        });
        this.pos += 2;
        continue;
      }

      // 4. Bold & Italic: Handles ***, **, and *
      if (char === "*") {
        // Triple asterisks: Bold + Italic
        if (next === "*" && this.text[this.pos + 2] === "*") {
          this.isBoldOpen = !this.isBoldOpen;
          this.isItalicOpen = !this.isItalicOpen;
          tokens.push({
            type: this.isBoldOpen ? TokenType.BOLD_OPEN : TokenType.BOLD_CLOSE,
            value: "**",
          });
          tokens.push({
            type: this.isItalicOpen
              ? TokenType.ITALIC_OPEN
              : TokenType.ITALIC_CLOSE,
            value: "*",
          });
          this.pos += 3;
          continue;
        }
        // Double asterisks: Bold
        if (next === "*") {
          this.isBoldOpen = !this.isBoldOpen;
          tokens.push({
            type: this.isBoldOpen ? TokenType.BOLD_OPEN : TokenType.BOLD_CLOSE,
            value: "**",
          });
          this.pos += 2;
          continue;
        }
        // Single asterisk: Italic
        this.isItalicOpen = !this.isItalicOpen;
        tokens.push({
          type: this.isItalicOpen
            ? TokenType.ITALIC_OPEN
            : TokenType.ITALIC_CLOSE,
          value: "*",
        });
        this.pos += 1;
        continue;
      }

      // 5. Plain Text: Consume until next potential marker
      let textVal = char;
      this.pos++;
      while (
        this.pos < this.text.length &&
        !"*~`[".includes(this.text[this.pos])
      ) {
        textVal += this.text[this.pos];
        this.pos++;
      }
      tokens.push({ type: TokenType.TEXT, value: textVal });
    }
    return tokens;
  }

  /**
   * Try to parse a link [text](url)
   * Returns null if not a valid link
   */
  private parseLink(): { text: string; url: string; newPos: number } | null {
    // Find closing ]
    const closeBracket = this.text.indexOf("]", this.pos + 1);
    if (closeBracket === -1) return null;

    // Check if next char is (
    if (this.text[closeBracket + 1] !== "(") return null;

    // Find closing )
    const closeParen = this.text.indexOf(")", closeBracket + 2);
    if (closeParen === -1) return null;

    const linkText = this.text.substring(this.pos + 1, closeBracket);
    const linkUrl = this.text.substring(closeBracket + 2, closeParen);

    return {
      text: linkText,
      url: linkUrl,
      newPos: closeParen + 1,
    };
  }
}

/**
 * Main parser function to convert raw string to TextSegments
 */
export function parseInlineStyles(text: string): TextSegment[] {
  const tokenizer = new Tokenizer(text);
  const tokens = tokenizer.tokenize();
  const segments: TextSegment[] = [];

  let bold = false;
  let italic = false;
  let strike = false;

  tokens.forEach((token) => {
    switch (token.type) {
      case TokenType.BOLD_OPEN:
        bold = true;
        break;
      case TokenType.BOLD_CLOSE:
        bold = false;
        break;
      case TokenType.ITALIC_OPEN:
        italic = true;
        break;
      case TokenType.ITALIC_CLOSE:
        italic = false;
        break;
      case TokenType.STRIKETHROUGH_OPEN:
        strike = true;
        break;
      case TokenType.STRIKETHROUGH_CLOSE:
        strike = false;
        break;

      case TokenType.TEXT:
      case TokenType.CODE:
        const seg = new TextSegment();
        seg.content = token.value;
        seg.isBold = bold;
        seg.isItalic = italic;
        seg.isStrikethrough = strike;
        seg.isCode = token.type === TokenType.CODE;
        segments.push(seg);
        break;

      case TokenType.LINK_TEXT:
        const linkSeg = new TextSegment();
        linkSeg.content = token.value;
        linkSeg.isBold = bold;
        linkSeg.isItalic = italic;
        linkSeg.isStrikethrough = strike;
        linkSeg.isLink = true;
        linkSeg.linkUrl = token.url || "";
        segments.push(linkSeg);
        break;
    }
  });

  return mergeSegments(segments);
}

/**
 * Merges consecutive segments with identical styles to optimize rendering
 */
function mergeSegments(segments: TextSegment[]): TextSegment[] {
  if (segments.length <= 1) return segments;

  const result: TextSegment[] = [];
  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];

    // Don't merge links with different URLs
    if (current.isLink || next.isLink) {
      if (current.isLink !== next.isLink || current.linkUrl !== next.linkUrl) {
        result.push(current);
        current = next;
        continue;
      }
    }

    const sameStyle =
      current.isCode === next.isCode &&
      current.isBold === next.isBold &&
      current.isItalic === next.isItalic &&
      current.isStrikethrough === next.isStrikethrough &&
      current.isLink === next.isLink &&
      current.linkUrl === next.linkUrl;

    if (sameStyle) {
      current.content += next.content;
    } else {
      result.push(current);
      current = next;
    }
  }
  result.push(current);
  return result;
}
