import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { CenterTabButton } from "@/components/center-tab-button";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          height: Platform.OS === "ios" ? 88 : 72,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "失物",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="found"
        options={{
          title: "尋獲",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="map" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "發布",
          tabBarShowLabel: false,
          tabBarIcon: () => null,
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "個人",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
