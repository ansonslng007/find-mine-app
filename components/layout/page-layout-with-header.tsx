import { useAppColors } from "@/hooks/use-app-colors";
import React, { ComponentProps, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
  const c = useAppColors();

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        content: {
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 150,
        },
        scrollContent: {
          gap: 12,
        },
      }),
    [c],
  );

  return (
    <View style={[pageStyles.page]}>
      <AppHeader
        screenTitle={screenTitle}
        screenSubtitle={screenSubtitle}
        icon={icon}
      />

      <View style={pageStyles.content}>
        {useScrollView ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pageStyles.scrollContent}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
