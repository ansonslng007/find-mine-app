import type { TranslateFn } from "@/components/lost-items/format";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIBRARY_PURPLE = "#7C3AED";

export type SheetStatusKind =
  | "idle"
  | "model"
  | "classify"
  | "search"
  | "analyze";

type SheetStatusProps = Readonly<{
  statusKind: SheetStatusKind;
  errorMessage: string | null;
  brandColor: string;
  rowStyle: ViewStyle;
  screenT: TranslateFn;
  analyzeLabel: string;
}>;

function SheetStatus({
  statusKind,
  errorMessage,
  brandColor,
  rowStyle,
  screenT,
  analyzeLabel,
}: SheetStatusProps) {
  if (errorMessage) {
    return (
      <View style={rowStyle}>
        <ThemedText type="labelError">{errorMessage}</ThemedText>
      </View>
    );
  }

  if (statusKind === "model") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("modelLoading")}</ThemedText>
      </View>
    );
  }

  if (statusKind === "classify") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("classifying")}</ThemedText>
      </View>
    );
  }

  if (statusKind === "search") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("searching")}</ThemedText>
      </View>
    );
  }

  if (statusKind === "analyze") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{analyzeLabel}</ThemedText>
      </View>
    );
  }

  return null;
}

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickLibrary: () => void;
  isBusy: boolean;
  statusKind: SheetStatusKind;
  errorMessage: string | null;
  /** 列表「以圖搜尋」用 `listSearch` 並傳 `scope`；FAB 用 `fabUpload`。 */
  presentation?: "listSearch" | "fabUpload";
  /** `listSearch` 時必填，用於相機／相簿等共用文案。 */
  scope?: "lostHome" | "foundHome";
  fabFooter?: React.ReactNode;
}>;

export function SearchByImageSheet({
  visible,
  onClose,
  onTakePhoto,
  onPickLibrary,
  isBusy,
  statusKind,
  errorMessage,
  presentation = "listSearch",
  scope = "lostHome",
  fabFooter,
}: Props) {
  const c = useAppColors();
  const { t } = useI18n();
  const screenT = (key: string) => t(`${scope}.${key}`);
  const insets = useSafeAreaInsets();
  const isFab = presentation === "fabUpload";

  const sheetTranslateY = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  useEffect(() => {
    const windowH = Dimensions.get("window").height;
    if (!visible) {
      sheetTranslateY.setValue(windowH);
      return;
    }
    sheetTranslateY.setValue(windowH);
    const id = requestAnimationFrame(() => {
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(id);
  }, [visible, sheetTranslateY]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: "flex-end",
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.45)",
        },
        sheet: {
          backgroundColor: c.cardBackground,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          gap: 16,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        headerTitle: {
          flex: 1,
        },
        closeHit: {
          padding: 8,
          marginRight: -8,
        },
        optionsRow: {
          flexDirection: "row",
          gap: 12,
        },
        optionCard: {
          flex: 1,
          backgroundColor: c.chipBackground,
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 12,
          alignItems: "center",
          gap: 10,
        },
        optionCardDisabled: {
          opacity: 0.45,
        },
        iconCircleBrand: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: c.brand,
          alignItems: "center",
          justifyContent: "center",
        },
        iconCirclePurple: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: LIBRARY_PURPLE,
          alignItems: "center",
          justifyContent: "center",
        },
        optionMain: {
          fontWeight: "600",
          textAlign: "center",
        },
        optionSub: {
          textAlign: "center",
        },
        hintBox: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          backgroundColor: c.chipBackground,
          borderRadius: 14,
          padding: 14,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          justifyContent: "center",
          paddingVertical: 4,
        },
      }),
    [c.cardBackground, c.chipBackground, c.brand, insets.bottom],
  );

  const busyOrError = isBusy || Boolean(errorMessage);

  const titleText = isFab
    ? t("fabUpload.uploadImageTitle")
    : screenT("searchByImageTitle");
  const hintText = isFab
    ? t("fabUpload.sheetHint")
    : screenT("searchByImageHint");
  const hintIcon = isFab ? ("photo.on.rectangle" as const) : ("magnifyingglass" as const);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isBusy ? () => {} : onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={isBusy ? undefined : onClose}
          disabled={isBusy}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitle}>
              <ThemedText type="screenTitle">{titleText}</ThemedText>
            </View>
            <Pressable
              style={styles.closeHit}
              onPress={isBusy ? undefined : onClose}
              disabled={isBusy}
              hitSlop={12}
            >
              <IconSymbol name="xmark" size={22} color={c.textMuted} />
            </Pressable>
          </View>

          <View style={styles.optionsRow}>
            <Pressable
              style={[
                styles.optionCard,
                busyOrError && styles.optionCardDisabled,
              ]}
              onPress={onTakePhoto}
              disabled={busyOrError}
            >
              <View style={styles.iconCircleBrand}>
                <IconSymbol name="camera.fill" size={26} color={c.onBrand} />
              </View>
              <ThemedText type="cardTitle" style={styles.optionMain}>
                {screenT("takePhoto")}
              </ThemedText>
              <ThemedText type="caption" style={styles.optionSub}>
                {screenT("takePhotoHint")}
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.optionCard,
                busyOrError && styles.optionCardDisabled,
              ]}
              onPress={onPickLibrary}
              disabled={busyOrError}
            >
              <View style={styles.iconCirclePurple}>
                <IconSymbol
                  name="photo.on.rectangle"
                  size={26}
                  color="#FFFFFF"
                />
              </View>
              <ThemedText type="cardTitle" style={styles.optionMain}>
                {screenT("pickLibrary")}
              </ThemedText>
              <ThemedText type="caption" style={styles.optionSub}>
                {screenT("pickLibraryHint")}
              </ThemedText>
            </Pressable>
          </View>

          {fabFooter}

          <SheetStatus
            statusKind={statusKind}
            errorMessage={errorMessage}
            brandColor={c.brand}
            rowStyle={styles.statusRow}
            screenT={screenT}
            analyzeLabel={t("fabUpload.analyzingImage")}
          />

          <View style={styles.hintBox}>
            <IconSymbol name={hintIcon} size={20} color={c.textMuted} />
            <ThemedText type="bodyMuted" style={{ flex: 1 }}>
              {hintText}
            </ThemedText>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
