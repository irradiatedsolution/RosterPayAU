// app/_layout.tsx
import { Stack } from 'expo-router';
import Purchases from 'react-native-purchases';

// Configure RevenueCat once at app startup
Purchases.configure({ apiKey: 'appl_iHuTtIBepoBhyrNijUroKKLstPC' });
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
