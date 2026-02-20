export type TokenType =
  | 'keyword'    // Keywords like const, let, function, if, else, return
  | 'string'     // String literals
  | 'number'     // Numbers
  | 'comment'    // Comments
  | 'function'   // Function names
  | 'operator'   // Operators
  | 'punctuation'// Brackets, braces, etc.
  | 'plain';     // Plain text

export interface Token {
  type: TokenType;
  value: string;
}

// Color scheme for syntax highlighting
export const TokenColors: Record<TokenType, string> = {
  keyword: '#0000FF',     // Blue
  string: '#008000',      // Green
  number: '#098658',      // Teal
  comment: '#808080',     // Gray
  function: '#795E26',    // Brown/Orange
  operator: '#000000',    // Black
  punctuation: '#000000', // Black
  plain: '#333333'        // Dark gray
};

// JavaScript/TypeScript keywords
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'default', 'try', 'catch',
  'finally', 'throw', 'new', 'this', 'typeof', 'instanceof', 'in', 'of',
  'class', 'extends', 'super', 'import', 'export', 'from', 'as', 'async',
  'await', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'yield',
  'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract',
  'public', 'private', 'protected', 'readonly', 'static', 'get', 'set'
]);

// Helper functions to check character types (ArkTS compatible)
function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isAlpha(char: string): boolean {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}

function isIdentStart(char: string): boolean {
  return isAlpha(char) || char === '_' || char === '$';
}

function isIdentChar(char: string): boolean {
  return isIdentStart(char) || isDigit(char);
}

function isOperatorChar(char: string): boolean {
  return '+-*/%=<>!&|^~'.includes(char);
}

function isPunctuationChar(char: string): boolean {
  return '(){}[];:.,'.includes(char);
}

const TWO_CHAR_OPERATORS = new Set([
  '++', '--', '&&', '||', '??', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
  '=>', '?.', '**', '<<', '>>', '>>>', '&=', '|=', '^='
]);

const SUPPORTED_LANGUAGES = new Set(['js', 'javascript', 'ts', 'typescript']);

export class SyntaxHighlighter {
  private code: string = '';
  private pos: number = 0;

  highlight(code: string, language: string = ''): Token[] {
    this.code = code;
    this.pos = 0;

    // For now, support JavaScript/TypeScript highlighting
    // Other languages fall back to plain text
    const lang = language.toLowerCase();
    if (language && !SUPPORTED_LANGUAGES.has(lang)) {
      return [{ type: 'plain', value: code }];
    }

    return this.tokenize();
  }

  private tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.code.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  private nextToken(): Token | null {
    const char = this.peek();

    // Whitespace
    if (isWhitespace(char)) {
      return this.readWhitespace();
    }

    // Comments
    if (char === '/' && this.peek(1) === '/') {
      return this.readLineComment();
    }

    if (char === '/' && this.peek(1) === '*') {
      return this.readBlockComment();
    }

    // Strings
    if (char === '"' || char === "'" || char === '`') {
      return this.readString(char);
    }

    // Numbers
    if (isDigit(char) || (char === '.' && isDigit(this.peek(1)))) {
      return this.readNumber();
    }

    // Identifiers (keywords, variables, functions)
    if (isIdentStart(char)) {
      return this.readIdentifier();
    }

    // Operators
    if (isOperatorChar(char)) {
      return this.readOperator();
    }

    // Punctuation
    if (isPunctuationChar(char)) {
      return this.readPunctuation();
    }

    // Any other character
    this.pos++;
    return { type: 'plain', value: char };
  }

  private peek(offset: number = 0): string {
    const idx = this.pos + offset;
    return idx < this.code.length ? this.code[idx] : '\0';
  }

  private readWhitespace(): Token {
    let value = '';
    while (isWhitespace(this.peek())) {
      value += this.code[this.pos++];
    }
    return { type: 'plain', value };
  }

  private readLineComment(): Token {
    let value = '';
    while (this.peek() !== '\n' && this.peek() !== '\0') {
      value += this.code[this.pos++];
    }
    return { type: 'comment', value };
  }

  private readBlockComment(): Token {
    let value = '';
    while (!(this.peek() === '*' && this.peek(1) === '/') && this.peek() !== '\0') {
      value += this.code[this.pos++];
    }
    if (this.peek() === '*') {
      value += this.code[this.pos++]; // *
      value += this.code[this.pos++]; // /
    }
    return { type: 'comment', value };
  }

  private readString(quote: string): Token {
    let value = this.code[this.pos++]; // opening quote

    while (this.peek() !== quote && this.peek() !== '\0') {
      if (this.peek() === '\\') {
        value += this.code[this.pos++]; // backslash
        value += this.code[this.pos++]; // escaped char
      } else {
        value += this.code[this.pos++];
      }
    }

    if (this.peek() === quote) {
      value += this.code[this.pos++]; // closing quote
    }

    return { type: 'string', value };
  }

  private readNumber(): Token {
    let value = '';

    // Integer part
    while (isDigit(this.peek())) {
      value += this.code[this.pos++];
    }

    // Decimal part
    if (this.peek() === '.' && isDigit(this.peek(1))) {
      value += this.code[this.pos++]; // .
      while (isDigit(this.peek())) {
        value += this.code[this.pos++];
      }
    }

    // Exponent part
    const next = this.peek();
    if (next === 'e' || next === 'E') {
      value += this.code[this.pos++]; // e or E
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.code[this.pos++];
      }
      while (isDigit(this.peek())) {
        value += this.code[this.pos++];
      }
    }

    return { type: 'number', value };
  }

  private readIdentifier(): Token {
    let value = '';
    while (isIdentChar(this.peek())) {
      value += this.code[this.pos++];
    }

    const type = KEYWORDS.has(value) ? 'keyword' : 'plain';
    return { type, value };
  }

  private readOperator(): Token {
    let value = '';
    // Multi-character operators
    const twoChar = this.peek() + this.peek(1);
    if (TWO_CHAR_OPERATORS.has(twoChar)) {
      value = twoChar;
      this.pos += 2;
    } else {
      value = this.code[this.pos++];
    }
    return { type: 'operator', value };
  }

  private readPunctuation(): Token {
    const value = this.code[this.pos++];
    return { type: 'punctuation', value };
  }
}

// Singleton instance
export const highlighter = new SyntaxHighlighter();
