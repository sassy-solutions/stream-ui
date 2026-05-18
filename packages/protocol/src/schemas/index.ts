/**
 * JSON Schemas (draft 2020-12) for the protocol surface.
 *
 * These are intended for agent-side validation: an agent can use them
 * to verify that the events it emits and the surfaces/forms it builds
 * conform to the wire shapes consumed by stream-ui.
 *
 * Schemas are exported as plain JSON objects (`as const` for narrowing)
 * with no runtime imports. They can be fed to ajv, @cfworker/json-schema,
 * or any other validator — stream-ui itself does not ship a validator.
 */

export { agUiEventSchema } from './ag-ui-event.js';
export { surfaceSchema } from './surface.js';
export { formSpecSchema } from './form-spec.js';
