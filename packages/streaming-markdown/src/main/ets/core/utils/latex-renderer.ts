const COMMAND_MAP: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  sigma: "σ",
  phi: "φ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Omega: "Ω",
  times: "×",
  cdot: "·",
  pm: "±",
  leq: "≤",
  geq: "≥",
  neq: "≠",
  approx: "≈",
  infty: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
};

const SUPER_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
};

const SUB_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

function toSuper(input: string): string {
  let output = "";
  for (const ch of input) {
    output += SUPER_MAP[ch] || ch;
  }
  return output;
}

function toSub(input: string): string {
  let output = "";
  for (const ch of input) {
    output += SUB_MAP[ch] || ch;
  }
  return output;
}

/**
 * Convert a light subset of LaTeX into readable Unicode text.
 * This keeps rendering stable in pure ArkTS Text/Span without external engines.
 */
export function renderLatexToText(latex: string): string {
  let result = latex;

  // Structural wrappers.
  result = result.replace(/\\left/g, "");
  result = result.replace(/\\right/g, "");
  result = result.replace(/\\text\{([^{}]*)\}/g, "$1");
  result = result.replace(/\\,/g, " ");

  // Common math constructs.
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  result = result.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // Commands/symbols.
  result = result.replace(/\\([A-Za-z]+)/g, (_match, name: string) => {
    return COMMAND_MAP[name] || name;
  });

  // Fallback: some upstream text may already lose backslashes (e.g., string escaping).
  // Keep a small safe alias set to recover common math operators.
  result = result.replace(/(^|[^A-Za-z])int(?=[_\s({]|$)/g, "$1∫");
  result = result.replace(/(^|[^A-Za-z])sum(?=[_\s({]|$)/g, "$1∑");
  result = result.replace(/(^|[^A-Za-z])prod(?=[_\s({]|$)/g, "$1∏");

  // Superscript/subscript groups.
  result = result.replace(/\^\{([^{}]+)\}/g, (_match, value: string) => toSuper(value));
  result = result.replace(/_\{([^{}]+)\}/g, (_match, value: string) => toSub(value));

  // Single-char superscript/subscript.
  result = result.replace(/\^([A-Za-z0-9+\-=()])/g, (_match, value: string) => toSuper(value));
  result = result.replace(/_([A-Za-z0-9+\-=()])/g, (_match, value: string) => toSub(value));

  return result.trim();
}
