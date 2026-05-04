import { useAppColors } from "@/hooks/use-app-colors";
import React, { ComponentProps, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "../ui/icon-symbol";
import { AppHeader } from "./app-header";

type PageLayoutWithHeaderProps = Readonly<{
  children: React.ReactNode;
  screenTitle: string;
  screenSubtitle: string;
  icon: ComponentProps<typeof IconSymbol>["name"];
  useScrollView?: boolean;
}>;

export function PageLayoutWithHeader({
  children,
  screenSubtitle,
  screenTitle,
  icon,
  useScrollView = true,
}: PageLayoutWithHeaderProps) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
          paddingHorizontal: 16,
        },
        content: {
          paddingBottom: 40,
          paddingTop: 8,
        },
      }),
    [c],
  );

  return (
    <View style={[pageStyles.page, { paddingTop: insets.top + 8 }]}>
      <AppHeader
        screenTitle={screenTitle}
        screenSubtitle={screenSubtitle}
        icon={icon}
      />

      {useScrollView ? (
        <ScrollView
          contentContainerStyle={pageStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}
