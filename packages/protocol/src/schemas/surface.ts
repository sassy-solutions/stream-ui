/**
 * JSON Schema for an A2UI v0.9 Surface.
 *
 * The component tree is recursive; we define `$defs.component` and
 * reference it. Props are an open record — A2UI is intentionally
 * extensible — so we don't enumerate prop keys here.
 */
export const surfaceSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stream-ui.dev/schemas/surface.json',
  title: 'Surface',
  type: 'object',
  required: ['version', 'id', 'root'],
  properties: {
    version: { const: '0.9' },
    id: { type: 'string' },
    title: { type: 'string' },
    state: { type: 'object' },
    root: { $ref: '#/$defs/component' },
  },
  $defs: {
    component: {
      type: 'object',
      required: ['id', 'kind'],
      properties: {
        id: { type: 'string' },
        kind: { type: 'string' },
        props: { type: 'object' },
        visibleIf: { $ref: '#/$defs/dataBinding' },
        forEach: { $ref: '#/$defs/dataBinding' },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/component' },
        },
      },
    },
    dataBinding: {
      oneOf: [
        {
          type: 'object',
          required: ['kind', 'value'],
          properties: {
            kind: { const: 'literal' },
            value: {},
          },
        },
        {
          type: 'object',
          required: ['kind', 'path'],
          properties: {
            kind: { const: 'ref' },
            path: { type: 'string' },
          },
        },
        {
          type: 'object',
          required: ['kind', 'expression'],
          properties: {
            kind: { const: 'expr' },
            expression: { type: 'string' },
          },
        },
      ],
    },
  },
} as const;
