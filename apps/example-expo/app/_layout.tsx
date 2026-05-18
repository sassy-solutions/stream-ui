import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1020' },
          headerTintColor: '#f5f7ff',
          contentStyle: { backgroundColor: '#0b1020' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'stream-ui demo' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
