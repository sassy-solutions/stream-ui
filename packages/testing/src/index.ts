/**
 * @stream-ui/testing — mocks, fixtures, and helpers for testing
 * `@stream-ui` consumers without a real agent server.
 *
 * The main entry is React-free; the optional React helper lives at
 * `@stream-ui/testing/react`.
 */

// Mock transport
export {
  createMockTransport,
  type DelayFn,
  type MockTransport,
  type MockTransportOptions,
} from './mock-transport.js';

// AG-UI event fixtures
export {
  agUiErrorFixture,
  agUiFormFixture,
  agUiPartialFormFixture,
  agUiTextStreamFixture,
  agUiToolCallFixture,
  type FormFixtureOptions,
  type TextStreamFixtureOptions,
  type ToolCallFixtureOptions,
} from './fixtures/ag-ui-events.js';

// A2UI form fixtures
export {
  a2uiFormFixtures,
  checkoutFormSpec,
  contactFormSpec,
  signupFormSpec,
  type A2uiFormFixtureName,
} from './fixtures/a2ui-forms.js';
