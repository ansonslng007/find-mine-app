import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { CenterTabButton } from "@/components/center-tab-button";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useChatUnreadCount } from "@/hooks/use-chat-unread-count";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FabUploadSheetProvider } from "@/providers/fab-upload-sheet-provider";
import { useI18n } from "@/providers/i18n-provider";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { t } = useI18n();
  const unreadQuery = useChatUnreadCount();
  const unreadTotal = unreadQuery.data ?? 0;
  let chatBadge: string | undefined;
  if (unreadTotal > 99) {
    chatBadge = "99+";
  } else if (unreadTotal > 0) {
    chatBadge = String(unreadTotal);
  }

  return (
    <FabUploadSheetProvider>
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
          title: t("tabs.lost"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="found"
        options={{
          title: t("tabs.found"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="map" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: t("tabs.post"),
          tabBarIcon: () => null,
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarBadge: chatBadge,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bubble.left.and.bubble.right" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
    </FabUploadSheetProvider>
  );
}
