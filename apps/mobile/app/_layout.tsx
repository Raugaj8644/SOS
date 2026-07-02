import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../stores/authStore';
import { C } from '../constants/colors';

export default function RootLayout() {
  const { isLoading, isAuthenticated, loadMe } = useAuthStore();

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="areas/join"
          options={{
            headerShown: true,
            title: 'JOIN AREA',
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.text,
            headerTitleStyle: { fontWeight: '800', letterSpacing: 2, fontSize: 13 },
          }}
        />
        <Stack.Screen
          name="areas/[areaId]/map"
          options={{ headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
