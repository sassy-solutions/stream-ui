/**
 * Best-effort partial JSON parser.
 *
 * Takes a possibly-truncated JSON string (typically the running buffer
 * of a streaming tool-call `argsDelta` concatenation) and returns the
 * most-complete value parseable by closing any open structures with
 * sane sentinels.
 *
 * Strategy:
 *   1. Walk the input once, tracking the structural stack and a
 *      "safe checkpoint" `{ pos, stack }` updated after each event
 *      that leaves the input in a state where appending closers
 *      `}` / `]` (drawn from the stack) yields valid JSON.
 *   2. If the input ends mid-literal but the literal up to EOF is a
 *      valid JSON token, treat it as complete (closes can still produce
 *      valid output even though a later chunk might extend the literal).
 *   3. Truncate input to the checkpoint, strip dangling commas/colons,
 *      append closers, and `JSON.parse`. Return `undefined` if nothing
 *      is parseable.
 *
 * Zero deps, intentionally small. Rewritten from scratch — not derived
 * from `partial-json`.
 */

type Frame =
  | { kind: 'object'; phase: 'key' | 'colon' | 'value' | 'comma' }
  | { kind: 'array'; phase: 'value' | 'comma' };

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const LITERAL_RE = /[0-9eE+\-.tfalsnrue]/;

interface Checkpoint {
  pos: number;
  stack: Frame[];
}

function cloneStack(stack: Frame[]): Frame[] {
  return stack.map((f) =>
    f.kind === 'object' ? { kind: 'object', phase: f.phase } : { kind: 'array', phase: f.phase },
  );
}

function scan(input: string): Checkpoint {
  const stack: Frame[] = [];
  let i = 0;
  let checkpoint: Checkpoint = { pos: 0, stack: [] };
  const safe = (pos: number) => {
    checkpoint = { pos, stack: cloneStack(stack) };
  };

  const top = (): Frame | undefined => stack[stack.length - 1];

  while (i < input.length) {
    const c = input[i] as string;

    if (WHITESPACE.has(c)) {
      i++;
      continue;
    }

    if (c === '{') {
      stack.push({ kind: 'object', phase: 'key' });
      i++;
      safe(i);
      continue;
    }
    if (c === '[') {
      stack.push({ kind: 'array', phase: 'value' });
      i++;
      safe(i);
      continue;
    }
    if (c === '}' || c === ']') {
      stack.pop();
      i++;
      const t = top();
      if (t) {
        if (t.kind === 'object') t.phase = 'comma';
        else t.phase = 'comma';
      }
      safe(i);
      continue;
    }
    if (c === ':') {
      const t = top();
      if (t && t.kind === 'object') t.phase = 'value';
      i++;
      // Not a safe boundary — waiting for value.
      continue;
    }
    if (c === ',') {
      const t = top();
      if (t) {
        if (t.kind === 'object') t.phase = 'key';
        else t.phase = 'value';
      }
      i++;
      safe(i);
      continue;
    }

    if (c === '"') {
      // Consume string. Determine whether it's a key or a value.
      const t = top();
      const isKey = !!(t && t.kind === 'object' && (t.phase === 'key' || t.phase === 'comma'));
      const endIdx = consumeString(input, i);
      if (endIdx < 0) {
        // Unterminated string. Stop here — checkpoint stays as last safe.
        return checkpoint;
      }
      i = endIdx;
      if (isKey) {
        if (t && t.kind === 'object') t.phase = 'colon';
        // Key-only is not safe — value still missing.
      } else {
        // String value completed.
        if (t) {
          if (t.kind === 'object') t.phase = 'comma';
          else t.phase = 'comma';
        }
        safe(i);
      }
      continue;
    }

    // Literal (number, true, false, null).
    const litStart = i;
    while (i < input.length && LITERAL_RE.test(input[i] as string)) i++;
    if (i === input.length) {
      // Literal ran to EOF. Test if the substring is a valid JSON value;
      // if yes, treat as safe — closers can still produce valid JSON.
      const lit = input.slice(litStart, i);
      try {
        JSON.parse(lit);
        // Tentatively mark frame post-value.
        const t = top();
        if (t) {
          if (t.kind === 'object') t.phase = 'comma';
          else t.phase = 'comma';
        }
        safe(i);
      } catch {
        // Drop the partial literal.
      }
      return checkpoint;
    }
    // Literal terminated by a structural char or whitespace.
    const t = top();
    if (t) {
      if (t.kind === 'object') t.phase = 'comma';
      else t.phase = 'comma';
    }
    safe(i);
  }

  return checkpoint;
}

function consumeString(input: string, start: number): number {
  // input[start] === '"'
  let i = start + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '"') return i + 1;
    i++;
  }
  return -1;
}

/**
 * Attempt to parse `input` directly; if that fails, repair by closing
 * open structures and parsing the safe prefix.
 *
 * Returns `undefined` if no non-trivial prefix is parseable.
 */
export function parsePartial(input: string): unknown {
  if (input == null) return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    /* fall through to repair */
  }

  const cp = scan(input);
  if (cp.pos === 0) return undefined;

  let body = input.slice(0, cp.pos).trimEnd();
  while (body.length > 0) {
    const last = body[body.length - 1];
    if (last === ',' || last === ':') {
      body = body.slice(0, -1).trimEnd();
      continue;
    }
    break;
  }

  let closer = '';
  for (let k = cp.stack.length - 1; k >= 0; k--) {
    const frame = cp.stack[k];
    if (!frame) continue;
    closer += frame.kind === 'object' ? '}' : ']';
  }

  const candidate = body + closer;
  if (candidate.length === 0) return undefined;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Stateful helper for callers that accumulate fragments over time.
 * Each call to `push(chunk)` returns the current best-effort value.
 */
export class IncrementalJsonParser {
  private buf = '';

  push(chunk: string): unknown {
    this.buf += chunk;
    return parsePartial(this.buf);
  }

  reset(): void {
    this.buf = '';
  }

  get raw(): string {
    return this.buf;
  }
}
