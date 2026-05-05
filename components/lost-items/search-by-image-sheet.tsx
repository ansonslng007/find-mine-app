import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { TranslateFn } from "@/components/lost-items/format";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIBRARY_PURPLE = "#7C3AED";

export type SheetStatusKind = "idle" | "model" | "classify" | "search";

type SheetStatusProps = Readonly<{
  statusKind: SheetStatusKind;
  errorMessage: string | null;
  brandColor: string;
  rowStyle: ViewStyle;
  t: TranslateFn;
}>;

function SheetStatus({
  statusKind,
  errorMessage,
  brandColor,
  rowStyle,
  t,
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
        <ThemedText type="bodyMuted">{t("home.modelLoading")}</ThemedText>
      </View>
    );
  }

  if (statusKind === "classify") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{t("home.classifying")}</ThemedText>
      </View>
    );
  }

  if (statusKind === "search") {
    return (
      <View style={rowStyle}>
        <ActivityIndicator color={brandColor} />
        <ThemedText type="bodyMuted">{t("home.searching")}</ThemedText>
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
}>;

export function SearchByImageSheet({
  visible,
  onClose,
  onTakePhoto,
  onPickLibrary,
  isBusy,
  statusKind,
  errorMessage,
}: Props) {
  const c = useAppColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isBusy ? () => {} : onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={isBusy ? undefined : onClose}
          disabled={isBusy}
        />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitle}>
              <ThemedText type="screenTitle">{t("home.searchByImageTitle")}</ThemedText>
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
                {t("home.takePhoto")}
              </ThemedText>
              <ThemedText type="caption" style={styles.optionSub}>
                {t("home.takePhotoHint")}
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
                {t("home.pickLibrary")}
              </ThemedText>
              <ThemedText type="caption" style={styles.optionSub}>
                {t("home.pickLibraryHint")}
              </ThemedText>
            </Pressable>
          </View>

          <SheetStatus
            statusKind={statusKind}
            errorMessage={errorMessage}
            brandColor={c.brand}
            rowStyle={styles.statusRow}
            t={t}
          />

          <View style={styles.hintBox}>
            <IconSymbol name="magnifyingglass" size={20} color={c.textMuted} />
            <ThemedText type="bodyMuted" style={{ flex: 1 }}>
              {t("home.searchByImageHint")}
            </ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
}
