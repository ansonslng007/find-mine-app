import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { RootAuthRedirect } from "@/components/root-auth-redirect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ColorSchemePreferenceProvider } from "@/providers/color-scheme-preference-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { AppQueryProvider } from "@/providers/query-client-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ColorSchemePreferenceProvider>
      <AppQueryProvider>
        <I18nProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <RootAuthRedirect />
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
      </AppQueryProvider>
    </ColorSchemePreferenceProvider>
  );
}
