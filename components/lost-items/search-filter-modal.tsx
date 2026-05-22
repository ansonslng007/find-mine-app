import type { LocationPickChange } from "@/components/location/location-pick-field";
import { LocationPickField } from "@/components/location/location-pick-field";
import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import { DateRangePickerModal } from "@/components/modal/date-range-picker-modal";
import {
  MapPickLocationModal,
  type MapPickLocationModalProps,
} from "@/components/modal/map-pick-location-modal";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { LostItemCategoryId } from "@/constants/items";
import {
  clampRadiusChoiceIndex,
  radiusMetersToChoiceIndex,
  SEARCH_RADIUS_METERS_CHOICES,
} from "@/constants/search-geo";
import { useAppColors } from "@/hooks/use-app-colors";
import type { AppLocale } from "@/lib/i18n/types";
import { useI18n } from "@/providers/i18n-provider";
import Slider from "@react-native-community/slider";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Track horizontal inset (logical px) so labels align roughly with the @react-native-community/slider thumb center. */
const SLIDER_THUMB_TRACK_INSET = 14;

const RADIUS_LABEL_I18N_KEYS = [
  "searchGeoRadius500m",
  "searchGeoRadius1km",
  "searchGeoRadius5km",
  "searchGeoRadius10km",
] as const;

export type SearchGeoState = {
  lat: number;
  lng: number;
  label: string;
  radiusMeters: number;
} | null;

function formatShortDate(d: Date, locale: AppLocale): string {
  return d.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRangeSummary(
  locale: AppLocale,
  from: Date | null,
  to: Date | null,
): string {
  if (from != null && to != null) {
    return `${formatShortDate(from, locale)} – ${formatShortDate(to, locale)}`;
  }
  if (from != null) {
    return formatShortDate(from, locale);
  }
  return "";
}

type SearchGeoSectionProps = Readonly<{
  screenT: (key: string) => string;
  brandColor: string;
  textMuted: string;
  textPrimary: string;
  chipBackground: string;
  searchGeo: SearchGeoState;
  onPressPickSearchCenterMap: () => void;
  onSearchLocationChange: (value: LocationPickChange) => void;
  onChangeSearchRadiusMeters: (meters: number) => void;
  onClearSearchGeo: () => void;
  styles: {
    geoBlock: object;
    sliderWithLabels: object;
    sliderLabelsRow: object;
    sliderLabel: object;
  };
}>;

function SearchGeoSection({
  screenT,
  brandColor,
  textMuted,
  textPrimary,
  chipBackground,
  searchGeo,
  onPressPickSearchCenterMap,
  onSearchLocationChange,
  onChangeSearchRadiusMeters,
  onClearSearchGeo,
  styles,
}: SearchGeoSectionProps) {
  const [sliderRowWidth, setSliderRowWidth] = useState(0);

  const radiusLabelLayout = useMemo(() => {
    if (sliderRowWidth <= 0) {
      return null;
    }
    const inset = SLIDER_THUMB_TRACK_INSET;
    const inner = Math.max(0, sliderRowWidth - 2 * inset);
    const last = RADIUS_LABEL_I18N_KEYS.length - 1;
    const centers = RADIUS_LABEL_I18N_KEYS.map((_, i) =>
      last === 0 ? inset + inner / 2 : inset + (inner * i) / last,
    );
    const step = last === 0 ? inner : inner / last;
    const slotW = Math.min(110, Math.max(52, step - 8));
    return { centers, slotW };
  }, [sliderRowWidth]);

  if (searchGeo == null) {
    return (
      <View style={styles.geoBlock}>
        <ThemedText type="defaultSemiBold" style={{ color: textPrimary }}>
          {screenT("searchGeoTitle")}
        </ThemedText>
        <LocationPickField
          addressLabel=""
          onLocationChange={onSearchLocationChange}
          onPressPickOnMap={onPressPickSearchCenterMap}
        />
      </View>
    );
  }

  const sliderIdx = radiusMetersToChoiceIndex(searchGeo.radiusMeters);

  return (
    <View style={styles.geoBlock}>
      <ThemedText type="defaultSemiBold" style={{ color: textPrimary }}>
        {screenT("searchGeoTitle")}
      </ThemedText>
      <LocationPickField
        addressLabel={searchGeo.label}
        onLocationChange={onSearchLocationChange}
        onPressPickOnMap={onPressPickSearchCenterMap}
        lat={searchGeo.lat}
        lng={searchGeo.lng}
      />
      <ThemedText type="defaultSemiBold" style={{ color: textPrimary }}>
        {screenT("searchGeoRadius")}
      </ThemedText>
      <View
        style={styles.sliderWithLabels}
        onLayout={(e) => setSliderRowWidth(e.nativeEvent.layout.width)}
      >
        <Slider
          style={{ width: "100%" }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={sliderIdx}
          onValueChange={(raw) => {
            const idx = clampRadiusChoiceIndex(raw);
            onChangeSearchRadiusMeters(SEARCH_RADIUS_METERS_CHOICES[idx]);
          }}
          minimumTrackTintColor={brandColor}
          maximumTrackTintColor={chipBackground}
          thumbTintColor={brandColor}
        />
        {radiusLabelLayout ? (
          <View style={styles.sliderLabelsRow} pointerEvents="none">
            {RADIUS_LABEL_I18N_KEYS.map((key, i) => (
              <View
                key={key}
                style={{
                  position: "absolute",
                  left:
                    radiusLabelLayout.centers[i] - radiusLabelLayout.slotW / 2,
                  width: radiusLabelLayout.slotW,
                  top: 0,
                  alignItems: "center",
                }}
              >
                <ThemedText
                  type="bodyMuted"
                  numberOfLines={2}
                  style={styles.sliderLabel}
                >
                  {screenT(key)}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onClearSearchGeo}
        style={{ alignSelf: "flex-start", paddingVertical: 4 }}
      >
        <ThemedText type="link">{screenT("searchGeoClear")}</ThemedText>
      </Pressable>
    </View>
  );
}

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  scope: "lostHome" | "foundHome";
  category: LostItemCategoryId;
  onCategoryChange: (id: LostItemCategoryId) => void;
  occurredFrom: Date | null;
  occurredTo: Date | null;
  onChangeOccurredFrom: (d: Date | null) => void;
  onChangeOccurredTo: (d: Date | null) => void;
  onClearOccurredRange: () => void;
  searchGeo: SearchGeoState;
  onPressPickSearchCenterMap: () => void;
  onSearchLocationChange: (value: LocationPickChange) => void;
  onChangeSearchRadiusMeters: (meters: number) => void;
  onClearSearchGeo: () => void;
  mapPickModal: MapPickLocationModalProps;
}>;

export function SearchFilterModal({
  visible,
  onClose,
  onApply,
  onReset,
  scope,
  category,
  onCategoryChange,
  occurredFrom,
  occurredTo,
  onChangeOccurredFrom,
  onChangeOccurredTo,
  onClearOccurredRange,
  searchGeo,
  onPressPickSearchCenterMap,
  onSearchLocationChange,
  onChangeSearchRadiusMeters,
  onClearSearchGeo,
  mapPickModal,
}: Props) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const screenT = (key: string) => t(`${scope}.${key}`);
  const [rangeVisible, setRangeVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        headerSide: {
          width: 72,
          alignItems: "flex-start",
        },
        headerSideRight: {
          width: 72,
          alignItems: "flex-end",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "700",
          color: c.textPrimary,
        },
        resetBtn: {
          paddingHorizontal: 8,
          paddingVertical: 6,
        },
        resetLabel: {
          fontSize: 15,
          fontWeight: "600",
          color: c.textPrimary,
        },
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 24,
        },
        dateBlock: {
          gap: 4,
        },
        rangeChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: c.chipBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          alignSelf: "stretch",
        },
        rangeChipActive: {
          borderColor: c.brand,
        },
        clearLink: {
          alignSelf: "flex-start",
          paddingVertical: 4,
          paddingHorizontal: 4,
        },
        geoBlock: {
          marginTop: 12,
          gap: 10,
        },
        sliderWithLabels: {
          width: "100%",
        },
        sliderLabelsRow: {
          position: "relative",
          width: "100%",
          minHeight: 36,
          marginTop: 8,
        },
        sliderLabel: {
          fontSize: 11,
          lineHeight: 14,
          textAlign: "center",
          color: c.textMuted,
          width: "100%",
        },
        footer: {
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.borderSubtle,
          backgroundColor: c.pageBackground,
        },
        applyBtn: {
          width: "100%",
          paddingVertical: 14,
          borderRadius: 10,
          backgroundColor: c.brand,
          alignItems: "center",
          justifyContent: "center",
        },
        applyLabel: {
          fontSize: 16,
          fontWeight: "700",
          color: c.onBrand,
        },
      }),
    [c, insets.bottom],
  );

  const hasAnyDate = occurredFrom != null || occurredTo != null;
  const rangeSummary = formatRangeSummary(locale, occurredFrom, occurredTo);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
        <View style={styles.page}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
            <View style={styles.headerSide}>
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
                <IconSymbol name="xmark" size={22} color={c.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.headerTitle}>{screenT("filterTitle")}</Text>
            <View style={styles.headerSideRight}>
              <Pressable onPress={onReset} style={styles.resetBtn}>
                <Text style={styles.resetLabel}>{screenT("filterReset")}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CategoryChipRow
              category={category}
              onCategoryChange={onCategoryChange}
            />
            <View style={styles.dateBlock}>
              <Pressable
                style={[
                  styles.rangeChip,
                  hasAnyDate ? styles.rangeChipActive : null,
                ]}
                onPress={() => setRangeVisible(true)}
              >
                <IconSymbol name="calendar" size={20} color={c.textMuted} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="defaultSemiBold"
                    numberOfLines={2}
                    style={{ color: c.textPrimary, fontSize: 14 }}
                  >
                    {hasAnyDate ? rangeSummary : screenT("occurredRangeOpen")}
                  </ThemedText>
                </View>
              </Pressable>
              {hasAnyDate ? (
                <Pressable
                  style={styles.clearLink}
                  onPress={onClearOccurredRange}
                >
                  <ThemedText type="link">{screenT("occurredClear")}</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <SearchGeoSection
              screenT={screenT}
              brandColor={c.brand}
              textMuted={c.textMuted}
              textPrimary={c.textPrimary}
              chipBackground={c.chipBackground}
              searchGeo={searchGeo}
              onPressPickSearchCenterMap={onPressPickSearchCenterMap}
              onSearchLocationChange={onSearchLocationChange}
              onChangeSearchRadiusMeters={onChangeSearchRadiusMeters}
              onClearSearchGeo={onClearSearchGeo}
              styles={{
                geoBlock: styles.geoBlock,
                sliderWithLabels: styles.sliderWithLabels,
                sliderLabelsRow: styles.sliderLabelsRow,
                sliderLabel: styles.sliderLabel,
              }}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.applyBtn} onPress={onApply}>
              <Text style={styles.applyLabel}>{t("common.apply")}</Text>
            </Pressable>
          </View>

          <DateRangePickerModal
            visible={rangeVisible}
            onClose={() => setRangeVisible(false)}
            title={screenT("occurredRangeTitle")}
            hint={screenT("occurredRangeHint")}
            clearLabel={screenT("occurredClear")}
            doneLabel={screenT("occurredRangeDone")}
            occurredFrom={occurredFrom}
            occurredTo={occurredTo}
            onChangeOccurredFrom={onChangeOccurredFrom}
            onChangeOccurredTo={onChangeOccurredTo}
            onClearOccurredRange={onClearOccurredRange}
          />
          <MapPickLocationModal
            {...mapPickModal}
            visible={mapPickModal.visible}
          />
        </View>
    </Modal>
  );
}
