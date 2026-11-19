import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../_ui';

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.navy, borderBottomColor: colors.accent, borderBottomWidth: 2 }} />,
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.danger,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 7,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={typeof color === 'string' ? color : colors.primary} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Legislative Archive',
          tabBarLabel: 'Records',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              color={typeof color === 'string' ? color : colors.primary}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Session Minutes',
          tabBarLabel: 'Sessions',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              color={typeof color === 'string' ? color : colors.primary}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News & Announcements',
          tabBarLabel: 'News',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'newspaper' : 'newspaper-outline'}
              color={typeof color === 'string' ? color : colors.primary}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Sangguniang Bayan',
          tabBarLabel: 'Council',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={typeof color === 'string' ? color : colors.primary}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
