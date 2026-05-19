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
  iconBackgroundColor?: string;
  useScrollView?: boolean;
  headerRight?: React.ReactNode;
}>;

export function PageLayoutWithHeader({
  children,
  screenSubtitle,
  screenTitle,
  icon,
  iconBackgroundColor,
  useScrollView = true,
  headerRight,
}: PageLayoutWithHeaderProps) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        content: {
          flex: 1,
          paddingHorizontal: 16,
        },
        headerOverlay: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        },
        scrollContent: {
          gap: 12,
          paddingTop: headerHeight + 16,
          paddingBottom: 30,
        },
        nonScrollContent: {
          flex: 1,
          paddingTop: headerHeight + 8,
          paddingBottom: 30,
        },
      }),
    [c, headerHeight],
  );

  return (
    <View style={[pageStyles.page]}>
      <View style={pageStyles.headerOverlay}>
        <AppHeader
          screenTitle={screenTitle}
          screenSubtitle={screenSubtitle}
          icon={icon}
          iconBackgroundColor={iconBackgroundColor}
          headerRight={headerRight}
        />
      </View>

      <View style={pageStyles.content}>
        {useScrollView ? (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pageStyles.scrollContent}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={pageStyles.nonScrollContent}>{children}</View>
        )}
      </View>
    </View>
  );
}
