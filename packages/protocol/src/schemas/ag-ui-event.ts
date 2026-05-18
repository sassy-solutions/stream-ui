/**
 * JSON Schema for the AG-UI event union.
 *
 * Pragmatic shape: a discriminated union keyed by `type`. We use `oneOf`
 * with a per-variant `const` discriminant so validators give precise
 * error messages.
 */
export const agUiEventSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stream-ui.dev/schemas/ag-ui-event.json',
  title: 'AgUiEvent',
  oneOf: [
    {
      type: 'object',
      required: ['type', 'runId'],
      properties: {
        type: { const: 'RUN_STARTED' },
        runId: { type: 'string' },
        threadId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'runId'],
      properties: {
        type: { const: 'RUN_FINISHED' },
        runId: { type: 'string' },
        reason: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'runId', 'message'],
      properties: {
        type: { const: 'RUN_ERROR' },
        runId: { type: 'string' },
        message: { type: 'string' },
        code: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'messageId'],
      properties: {
        type: { const: 'TEXT_MESSAGE_START' },
        messageId: { type: 'string' },
        role: { enum: ['assistant', 'tool', 'system'] },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'messageId', 'delta'],
      properties: {
        type: { const: 'TEXT_MESSAGE_CONTENT' },
        messageId: { type: 'string' },
        delta: { type: 'string' },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'messageId'],
      properties: {
        type: { const: 'TEXT_MESSAGE_END' },
        messageId: { type: 'string' },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'toolCallId', 'toolName'],
      properties: {
        type: { const: 'TOOL_CALL_START' },
        toolCallId: { type: 'string' },
        toolName: { type: 'string' },
        parentMessageId: { type: 'string' },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'toolCallId', 'argsDelta'],
      properties: {
        type: { const: 'TOOL_CALL_ARGS' },
        toolCallId: { type: 'string' },
        argsDelta: { type: 'string' },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'toolCallId'],
      properties: {
        type: { const: 'TOOL_CALL_END' },
        toolCallId: { type: 'string' },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'state'],
      properties: {
        type: { const: 'STATE_SNAPSHOT' },
        state: {},
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'patch'],
      properties: {
        type: { const: 'STATE_DELTA' },
        patch: {
          type: 'array',
          items: {
            type: 'object',
            required: ['op', 'path'],
            properties: {
              op: {
                enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'],
              },
              path: { type: 'string' },
              value: {},
              from: { type: 'string' },
            },
          },
        },
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'surfaceId'],
      properties: {
        type: { const: 'UI_SURFACE_UPDATE' },
        surfaceId: { type: 'string' },
        surface: { $ref: 'https://stream-ui.dev/schemas/surface.json' },
        patch: {},
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
    {
      type: 'object',
      required: ['type', 'name', 'payload'],
      properties: {
        type: { const: 'CUSTOM' },
        name: { type: 'string' },
        payload: {},
        runId: { type: 'string' },
        timestamp: { type: 'number' },
      },
    },
  ],
} as const;
