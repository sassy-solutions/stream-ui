# example-expo

Expo SDK 53+ demo for [`@stream-ui/react-native`](../../packages/react-native).
Same UX as `example-web`: a streaming chat conversation with a checkout form
that materialises inside the agent reply, driven entirely by a mock AG-UI
transport from `@stream-ui/testing`.

## Stack

- Expo SDK 53, expo-router 5
- React 19, React Native 0.79
- `@stream-ui/react-native` primitives (`Chat.*`, `Form.*`) + hooks
  (`useChatClient`, `useSurface`)
- `@stream-ui/testing` (`createMockTransport`, `agUiFormFixture`,
  `checkoutFormSpec`)

## Run

From the monorepo root:

```bash
pnpm install
pnpm --filter example-expo start
```

Then:

- press `i` to open the iOS simulator
- press `a` to open Android emulator
- or scan the QR code with **Expo Go** on a physical device

The composer's `KeyboardAvoidingView` is provided by `<Chat.Root>` (it wraps
its children in the platform-aware `KeyboardAvoidingView` helper from
`@stream-ui/react-native/keyboard/avoiding-view`). Tapping fields lifts the
form above the keyboard on both iOS and Android.

## What the demo does

On mount, a hand-crafted AG-UI event script is replayed through
`createMockTransport` with a 50–150 ms jitter per event:

1. assistant text streams in (`"Sure — let me pull up the checkout form for
   you."`)
2. a `UI_SURFACE_UPDATE` event delivers the `checkoutFormSpec`
3. a closing assistant message streams in

The form renders fields via native `TextInput`, `Switch`, and a small custom
`OptionPicker` for `select` / `radio`. Submitting fires a native
`Alert.alert("submitted", …)` with the form payload (the RN analogue of the
web toast).

## Layout

```
apps/example-expo/
├── app.json              # Expo config (SDK 53, expo-router plugin)
├── package.json
├── tsconfig.json
├── expo-env.d.ts
└── app/
    ├── _layout.tsx       # Stack navigator + SafeAreaProvider + StatusBar
    └── index.tsx         # Chat screen: messages + embedded form + composer
```
