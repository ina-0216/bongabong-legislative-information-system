import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors, StartupScreen } from './_ui';

export default function RootLayout() {
  const [showStartupScreen, setShowStartupScreen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowStartupScreen(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.navy, borderBottomColor: colors.accent, borderBottomWidth: 2 }} />,
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen
          name="document/[id]"
          options={{
            title: 'Document Details',
            headerBackTitle: 'Records',
          }}
        />
        <Stack.Screen
          name="news/[id]"
          options={{
            title: 'News & Announcements',
            headerBackTitle: 'News',
          }}
        />
        <Stack.Screen
          name="feedback"
          options={{
            title: 'Citizen Consultation',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="committees"
          options={{
            title: 'Standing Committees',
            headerBackTitle: 'Council',
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            title: 'About the Sangguniang Bayan',
            headerBackTitle: 'Home',
          }}
        />
        <Stack.Screen
          name="mission-vision"
          options={{
            title: 'Vision, Mission & Values',
            headerBackTitle: 'Home',
          }}
        />
      </Stack>
      {showStartupScreen ? <StartupScreen /> : null}
    </>
  );
}
