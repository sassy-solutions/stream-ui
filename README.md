# @stream-ui

> Form-first LLM streaming + parsing for **React** and **React Native**.
> AG-UI + A2UI native. Zero runtime deps. ~16KB total.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why

Most LLM chat libs are chat-first. `@stream-ui` is **form-first**: it makes embedded, streaming, validated forms inside LLM responses a first-class primitive.

| | `@stream-ui` | assistant-ui | Vercel AI SDK UI | CopilotKit |
|---|---|---|---|---|
| Form-first | ✅ | ❌ | ❌ | partial |
| Real React+RN parity | ✅ | recent | ❌ | ❌ |
| Zero runtime deps | ✅ | ❌ (~12) | ❌ | ❌ |
| AG-UI + A2UI native | ✅ | adapter | ❌ | partial |
| Bundle size target | ~16KB | ~85KB | ~40KB | ~120KB |

## Packages

| Package | What |
|---|---|
| [`@stream-ui/protocol`](./packages/protocol) | Types for AG-UI events + A2UI v0.9 surfaces + `form` extension |
| [`@stream-ui/core`](./packages/core) | Transport (SSE/WS), incremental JSON parser, state store, form engine |
| [`@stream-ui/react`](./packages/react) | React hooks + headless asChild primitives + RSC helper |
| [`@stream-ui/react-native`](./packages/react-native) | RN hooks + native primitives (TextInput, FlatList) |
| [`@stream-ui/testing`](./packages/testing) | Mocks, AG-UI fixtures, RTL helpers |

## Status

Pre-alpha. v0.1.0 in progress.

## License

MIT
