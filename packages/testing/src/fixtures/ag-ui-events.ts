import {
  AG_UI_EVENT_TYPES,
  type AgUiEvent,
  type FormSpec,
  type Surface,
} from '@stream-ui/protocol';

export interface TextStreamFixtureOptions {
  /** Override message id. Default: `msg-1`. */
  messageId?: string;
  /** Override run id. Default: `run-1`. */
  runId?: string;
  /** Token size in characters. Default: 4. */
  chunkSize?: number;
  /** Include RUN_STARTED / RUN_FINISHED bookends. Default: true. */
  withRunFraming?: boolean;
}

/**
 * Build a script for a single assistant text message — RUN_STARTED →
 * TEXT_MESSAGE_START → N × TEXT_MESSAGE_CONTENT → TEXT_MESSAGE_END →
 * RUN_FINISHED.
 *
 * Chunks `text` into fixed-size deltas so the consumer experiences a
 * realistic token-by-token stream.
 */
export function agUiTextStreamFixture(
  text: string,
  options: TextStreamFixtureOptions = {},
): AgUiEvent[] {
  const messageId = options.messageId ?? 'msg-1';
  const runId = options.runId ?? 'run-1';
  const chunkSize = Math.max(1, options.chunkSize ?? 4);
  const withFraming = options.withRunFraming ?? true;
  const events: AgUiEvent[] = [];

  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_STARTED, runId });
  }
  events.push({
    type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_START,
    messageId,
    role: 'assistant',
    runId,
  });
  for (let i = 0; i < text.length; i += chunkSize) {
    events.push({
      type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: text.slice(i, i + chunkSize),
      runId,
    });
  }
  events.push({ type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_END, messageId, runId });
  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_FINISHED, runId, reason: 'stop' });
  }
  return events;
}

export interface ToolCallFixtureOptions {
  /** Tool-call id. Default: `tool-1`. */
  toolCallId?: string;
  /** Run id. Default: `run-1`. */
  runId?: string;
  /** Argument chunk size. Default: 8. */
  chunkSize?: number;
  /** Include RUN_STARTED / RUN_FINISHED bookends. Default: true. */
  withRunFraming?: boolean;
  /** Parent message id, if the tool call is anchored. */
  parentMessageId?: string;
}

/**
 * Build a script for a tool call. Arguments are JSON-stringified and
 * chunked across TOOL_CALL_ARGS frames.
 */
export function agUiToolCallFixture(
  toolName: string,
  args: unknown,
  options: ToolCallFixtureOptions = {},
): AgUiEvent[] {
  const toolCallId = options.toolCallId ?? 'tool-1';
  const runId = options.runId ?? 'run-1';
  const chunkSize = Math.max(1, options.chunkSize ?? 8);
  const withFraming = options.withRunFraming ?? true;
  const json = JSON.stringify(args);
  const events: AgUiEvent[] = [];

  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_STARTED, runId });
  }
  events.push({
    type: AG_UI_EVENT_TYPES.TOOL_CALL_START,
    toolCallId,
    toolName,
    parentMessageId: options.parentMessageId,
    runId,
  });
  for (let i = 0; i < json.length; i += chunkSize) {
    events.push({
      type: AG_UI_EVENT_TYPES.TOOL_CALL_ARGS,
      toolCallId,
      argsDelta: json.slice(i, i + chunkSize),
      runId,
    });
  }
  events.push({ type: AG_UI_EVENT_TYPES.TOOL_CALL_END, toolCallId, runId });
  if (withFraming) {
    events.push({
      type: AG_UI_EVENT_TYPES.RUN_FINISHED,
      runId,
      reason: 'tool_calls',
    });
  }
  return events;
}

export interface FormFixtureOptions {
  /** Surface id. Default: `surface-1`. */
  surfaceId?: string;
  /** Run id. Default: `run-1`. */
  runId?: string;
  /** Include RUN_STARTED / RUN_FINISHED bookends. Default: true. */
  withRunFraming?: boolean;
}

/**
 * Single UI_SURFACE_UPDATE event that carries the given FormSpec
 * wrapped in a one-component Surface. Use this when you only need the
 * "surface arrived" moment, not a partial-streaming sequence.
 */
export function agUiFormFixture(spec: FormSpec, options: FormFixtureOptions = {}): AgUiEvent[] {
  const surfaceId = options.surfaceId ?? 'surface-1';
  const runId = options.runId ?? 'run-1';
  const withFraming = options.withRunFraming ?? true;
  const surface: Surface = {
    id: surfaceId,
    root: {
      id: `${surfaceId}-root`,
      kind: 'form',
      props: { spec },
    },
  } as Surface;
  const events: AgUiEvent[] = [];
  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_STARTED, runId });
  }
  events.push({
    type: AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE,
    surfaceId,
    surface,
    runId,
  });
  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_FINISHED, runId, reason: 'stop' });
  }
  return events;
}

/**
 * Same as `agUiFormFixture` but emits the surface in two halves: first
 * an empty form shell, then a SurfacePatch that fills in the fields.
 * Use this to test progressive form rendering.
 */
export function agUiPartialFormFixture(
  spec: FormSpec,
  options: FormFixtureOptions = {},
): AgUiEvent[] {
  const surfaceId = options.surfaceId ?? 'surface-1';
  const runId = options.runId ?? 'run-1';
  const withFraming = options.withRunFraming ?? true;
  const shellSpec: FormSpec = {
    ...spec,
    fields: [],
  };
  const shell: Surface = {
    id: surfaceId,
    root: {
      id: `${surfaceId}-root`,
      kind: 'form',
      props: { spec: shellSpec },
    },
  } as Surface;
  const events: AgUiEvent[] = [];
  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_STARTED, runId });
  }
  events.push({
    type: AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE,
    surfaceId,
    surface: shell,
    runId,
  });
  events.push({
    type: AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE,
    surfaceId,
    patch: {
      ops: [
        {
          op: 'replace',
          path: '/root/props/spec',
          value: spec,
        },
      ],
    } as never,
    runId,
  });
  if (withFraming) {
    events.push({ type: AG_UI_EVENT_TYPES.RUN_FINISHED, runId, reason: 'stop' });
  }
  return events;
}

/**
 * Generic builder: a single RUN_ERROR event with optional framing.
 */
export function agUiErrorFixture(
  message: string,
  options: { runId?: string; code?: string } = {},
): AgUiEvent[] {
  const runId = options.runId ?? 'run-1';
  return [
    { type: AG_UI_EVENT_TYPES.RUN_STARTED, runId },
    { type: AG_UI_EVENT_TYPES.RUN_ERROR, runId, message, code: options.code },
  ];
}
