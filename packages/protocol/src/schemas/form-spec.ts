/**
 * JSON Schema for the stream-ui `form` extension to A2UI v0.9.
 *
 * Mirrors FieldSpec / FormSpec / SubmitAction in ./a2ui/form.ts.
 */
export const formSpecSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stream-ui.dev/schemas/form-spec.json',
  title: 'FormSpec',
  type: 'object',
  required: ['id', 'fields', 'submit'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    fields: {
      type: 'array',
      items: { $ref: '#/$defs/field' },
    },
    submit: { $ref: '#/$defs/submitAction' },
    secondaryActions: {
      type: 'array',
      items: { $ref: '#/$defs/submitAction' },
    },
    initialValues: { type: 'object' },
  },
  $defs: {
    field: {
      type: 'object',
      required: ['name', 'kind'],
      properties: {
        name: { type: 'string' },
        kind: {
          enum: [
            'text',
            'textarea',
            'email',
            'url',
            'password',
            'number',
            'integer',
            'boolean',
            'select',
            'multiselect',
            'radio',
            'checkbox',
            'date',
            'datetime',
            'time',
            'file',
            'hidden',
          ],
        },
        label: { type: 'string' },
        description: { type: 'string' },
        placeholder: { type: 'string' },
        defaultValue: {},
        disabled: {},
        hidden: {},
        visibleIf: {},
        options: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'value'],
            properties: {
              label: { type: 'string' },
              value: {
                type: ['string', 'number', 'boolean'],
              },
              description: { type: 'string' },
              disabled: { type: 'boolean' },
            },
          },
        },
        constraints: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            minLength: { type: 'integer', minimum: 0 },
            maxLength: { type: 'integer', minimum: 0 },
            pattern: { type: 'string' },
            min: { type: 'number' },
            max: { type: 'number' },
            multipleOf: { type: 'number' },
            minItems: { type: 'integer', minimum: 0 },
            maxItems: { type: 'integer', minimum: 0 },
            accept: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        ui: { type: 'object' },
      },
    },
    submitAction: {
      type: 'object',
      required: ['target'],
      properties: {
        target: { type: 'string' },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        label: { type: 'string' },
        disableUntilValid: { type: 'boolean' },
        confirm: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            message: { type: 'string' },
            confirmLabel: { type: 'string' },
            cancelLabel: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
