import type { LocationPickChange } from "@/components/location/location-pick-field";
import { LocationPickField } from "@/components/location/location-pick-field";
import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import { DateRangePickerModal } from "@/components/modal/date-range-picker-modal";
import { ThemedText } from "@/components/themed-text";
import { IconButton } from "@/components/ui/icon-button";
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
import { Pressable, StyleSheet, TextInput, View } from "react-native";

/** Track horizontal inset (logical px) so labels align roughly with the @react-native-community/slider thumb center. */
const SLIDER_THUMB_TRACK_INSET = 14;

const RADIUS_LABEL_I18N_KEYS = [
  "searchGeoRadius500m",
  "searchGeoRadius1km",
  "searchGeoRadius5km",
  "searchGeoRadius10km",
] as const;

type SearchGeoState = {
  lat: number;
  lng: number;
  label: string;
  radiusMeters: number;
} | null;

type Props = Readonly<{
  query: string;
  onQueryChange: (q: string) => void;
  onPressSearchByImage: () => void;
  isFilterExpanded: boolean;
  onToggleFilterExpanded: () => void;
  scope: "lostHome" | "foundHome";
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
  category: LostItemCategoryId;
  onCategoryChange: (id: LostItemCategoryId) => void;
}>;

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

export function SearchFilterRow({
  query,
  onQueryChange,
  onPressSearchByImage,
  isFilterExpanded,
  onToggleFilterExpanded,
  scope,
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
  category,
  onCategoryChange,
}: Props) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const screenT = (key: string) => t(`${scope}.${key}`);
  const [rangeVisible, setRangeVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: 14,
        },
        searchRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
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
        searchField: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.chipBackground,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8,
        },
        searchInput: {
          flex: 1,
          fontSize: 16,
          color: c.textPrimary,
          padding: 0,
        },
        cameraFab: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.chipBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
        },
        cameraFabActive: {
          backgroundColor: c.brand,
          borderColor: c.brand,
        },
        clearLink: {
          alignSelf: "flex-start",
          paddingVertical: 4,
          paddingHorizontal: 4,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          padding: 20,
        },
        modalCard: {
          borderRadius: 16,
          padding: 12,
          backgroundColor: c.cardBackground,
          maxHeight: "90%",
        },
        modalTitle: {
          marginBottom: 6,
          textAlign: "center",
        },
        modalHint: {
          marginBottom: 10,
          textAlign: "center",
        },
        modalActions: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          gap: 8,
        },
        modalBtn: {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
        },
        modalBtnPrimary: {
          backgroundColor: c.brand,
        },
        modalBtnGhost: {
          backgroundColor: "transparent",
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
      }),
    [c],
  );

  const hasAnyDate = occurredFrom != null || occurredTo != null;
  const hasActiveFilter = category !== "all" || hasAnyDate || searchGeo != null;
  const rangeSummary = formatRangeSummary(locale, occurredFrom, occurredTo);

  const openRangeModal = () => {
    setRangeVisible(true);
  };

  const closeModal = () => {
    setRangeVisible(false);
  };

  let filterIconColor = c.textPrimary;
  let filterBtnStyle: object | null = null;

  if (hasActiveFilter && isFilterExpanded) {
    filterBtnStyle = { backgroundColor: "#1f883d", borderColor: "#1f883d" };
    filterIconColor = "#fff";
  } else if (hasActiveFilter && !isFilterExpanded) {
    filterIconColor = "#1f883d";
  } else if (isFilterExpanded) {
    filterBtnStyle = styles.cameraFabActive;
    filterIconColor = c.onBrand;
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.searchRow,
          isFilterExpanded ? { marginBottom: 10 } : { marginBottom: 0 },
        ]}
      >
        <View style={styles.searchField}>
          <IconSymbol name="magnifyingglass" size={20} color={c.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t(`${scope}.searchPlaceholder`)}
            placeholderTextColor={c.placeholder}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
          />
        </View>
        <Pressable style={styles.cameraFab} onPress={onPressSearchByImage}>
          <IconSymbol name="camera.fill" size={22} color={c.textPrimary} />
        </Pressable>
        <IconButton
          onPress={onToggleFilterExpanded}
          style={[styles.cameraFab, filterBtnStyle]}
        >
          <IconSymbol
            name={
              isFilterExpanded || hasActiveFilter
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle"
            }
            size={22}
            color={filterIconColor}
          />
        </IconButton>
      </View>

      {isFilterExpanded ? (
        <>
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
              onPress={openRangeModal}
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
        </>
      ) : null}

      <DateRangePickerModal
        visible={rangeVisible}
        onClose={closeModal}
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
    </View>
  );
}
