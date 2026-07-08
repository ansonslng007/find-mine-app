import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { PushNotificationsSetup } from "@/components/push-notifications-setup";
import { RootAuthRedirect } from "@/components/root-auth-redirect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ColorSchemePreferenceProvider } from "@/providers/color-scheme-preference-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { ChatSocketProvider } from "@/providers/chat-socket-provider";
import { AppQueryProvider } from "@/providers/query-client-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ColorSchemePreferenceProvider>
        <RootLayoutContent />
      </ColorSchemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <AppQueryProvider>
      <ChatSocketProvider>
        <I18nProvider>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <RootAuthRedirect />
            <PushNotificationsSetup />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="item/[id]"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="item/edit/[id]"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="chat/[conversationId]"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="profile/my-items"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="sign-in"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="sign-up"
                options={{
                  headerShown: false,
                  presentation: "card",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </I18nProvider>
      </ChatSocketProvider>
    </AppQueryProvider>
  );
}
