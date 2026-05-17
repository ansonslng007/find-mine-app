import { IconButton } from "@/components/ui/icon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import {
  clampRadiusChoiceIndex,
  SEARCH_RADIUS_METERS_CHOICES,
  radiusMetersToChoiceIndex,
} from "@/constants/search-geo";
import type { LostItemCategoryId } from "@/constants/mock-lost-items";
import { useAppColors } from "@/hooks/use-app-colors";
import type { AppLocale } from "@/lib/i18n/types";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Calendar, type DateData } from "react-native-calendars";

/** Track horizontal inset (logical px) so labels align roughly with the @react-native-community/slider thumb center. */
const SLIDER_THUMB_TRACK_INSET = 14;

const RADIUS_LABEL_I18N_KEYS = [
  "searchGeoRadius500m",
  "searchGeoRadius1km",
  "searchGeoRadius5km",
  "searchGeoRadius10km",
] as const;

type PeriodMarkedDates = Record<
  string,
  { color: string; startingDay?: boolean; endingDay?: boolean }
>;

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
  onPressSearchCenterGps: () => void;
  onChangeSearchRadiusMeters: (meters: number) => void;
  onClearSearchGeo: () => void;
  category: LostItemCategoryId;
  onCategoryChange: (id: LostItemCategoryId) => void;
}>;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD strings compare lexicographically. Clamp ymd to at most maxYmd (inclusive). */
function clampYmd(ymd: string, maxYmd: string): string {
  if (ymd > maxYmd) {
    return maxYmd;
  }
  return ymd;
}

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, m - 1, d);
}

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

function buildPeriodMarkedDates(
  startYmd: string | null,
  endYmd: string | null,
  color: string,
): PeriodMarkedDates {
  const out: PeriodMarkedDates = {};
  if (startYmd == null) {
    return out;
  }
  if (endYmd == null || startYmd === endYmd) {
    out[startYmd] = { startingDay: true, endingDay: true, color };
    return out;
  }
  const lo = startYmd < endYmd ? startYmd : endYmd;
  const hi = startYmd < endYmd ? endYmd : startYmd;
  const cur = parseLocalYmd(lo);
  const endD = parseLocalYmd(hi);
  while (cur.getTime() <= endD.getTime()) {
    const ds = toLocalYmd(cur);
    out[ds] = {
      color,
      startingDay: ds === lo,
      endingDay: ds === hi,
    };
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

type SearchGeoSectionProps = Readonly<{
  screenT: (key: string) => string;
  brandColor: string;
  textMuted: string;
  textPrimary: string;
  chipBackground: string;
  searchGeo: SearchGeoState;
  onPressPickSearchCenterMap: () => void;
  onPressSearchCenterGps: () => void;
  onChangeSearchRadiusMeters: (meters: number) => void;
  onClearSearchGeo: () => void;
  styles: {
    geoBlock: object;
    geoRow: object;
    geoBtn: object;
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
  onPressSearchCenterGps,
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
        <View style={styles.geoRow}>
          <Pressable style={styles.geoBtn} onPress={onPressPickSearchCenterMap}>
            <IconSymbol name="map" size={20} color={textMuted} />
            <ThemedText
              type="defaultSemiBold"
              style={{ color: textPrimary, fontSize: 14 }}
              numberOfLines={1}
            >
              {screenT("searchGeoPickMap")}
            </ThemedText>
          </Pressable>
          <Pressable style={styles.geoBtn} onPress={onPressSearchCenterGps}>
            <IconSymbol name="location.fill" size={20} color={textMuted} />
            <ThemedText
              type="defaultSemiBold"
              style={{ color: textPrimary, fontSize: 14 }}
              numberOfLines={1}
            >
              {screenT("searchGeoUseGps")}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="bodyMuted">{screenT("searchGeoHintNoCenter")}</ThemedText>
      </View>
    );
  }

  const sliderIdx = radiusMetersToChoiceIndex(searchGeo.radiusMeters);

  return (
    <View style={styles.geoBlock}>
      <ThemedText type="defaultSemiBold" style={{ color: textPrimary }}>
        {screenT("searchGeoTitle")}
      </ThemedText>
      <View style={styles.geoRow}>
        <Pressable style={styles.geoBtn} onPress={onPressPickSearchCenterMap}>
          <IconSymbol name="map" size={20} color={textMuted} />
          <ThemedText
            type="defaultSemiBold"
            style={{ color: textPrimary, fontSize: 14 }}
            numberOfLines={1}
          >
            {screenT("searchGeoPickMap")}
          </ThemedText>
        </Pressable>
        <Pressable style={styles.geoBtn} onPress={onPressSearchCenterGps}>
          <IconSymbol name="location.fill" size={20} color={textMuted} />
          <ThemedText
            type="defaultSemiBold"
            style={{ color: textPrimary, fontSize: 14 }}
            numberOfLines={1}
          >
            {screenT("searchGeoUseGps")}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="body" numberOfLines={2} style={{ color: textPrimary }}>
        {searchGeo.label}
      </ThemedText>
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
                  left: radiusLabelLayout.centers[i] - radiusLabelLayout.slotW / 2,
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

type DraftRange = Readonly<{
  start: string | null;
  end: string | null;
}>;

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
  onPressSearchCenterGps,
  onChangeSearchRadiusMeters,
  onClearSearchGeo,
  category,
  onCategoryChange,
}: Props) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const screenT = (key: string) => t(`${scope}.${key}`);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [draft, setDraft] = useState<DraftRange>({ start: null, end: null });

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
        geoRow: {
          flexDirection: "row",
          gap: 8,
        },
        geoBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: 6,
          borderRadius: 12,
          backgroundColor: c.chipBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
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
  const rangeSummary = formatRangeSummary(locale, occurredFrom, occurredTo);

  const todayYmd = toLocalYmd(new Date());

  const markedDates = useMemo(
    () => buildPeriodMarkedDates(draft.start, draft.end, c.brand),
    [draft.start, draft.end, c.brand],
  );

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: c.cardBackground,
      textSectionTitleColor: c.textMuted,
      selectedDayBackgroundColor: c.brand,
      selectedDayTextColor: c.onBrand,
      todayTextColor: c.brand,
      dayTextColor: c.textPrimary,
      textDisabledColor: c.textMuted,
      monthTextColor: c.textPrimary,
      arrowColor: c.brand,
      textDayFontSize: 15,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 12,
    }),
    [c],
  );

  const calendarCurrent =
    draft.end ?? draft.start ?? todayYmd;

  const openRangeModal = () => {
    const max = todayYmd;
    const startRaw =
      occurredFrom != null ? toLocalYmd(occurredFrom) : null;
    const endRaw = occurredTo != null ? toLocalYmd(occurredTo) : null;
    const start = startRaw != null ? clampYmd(startRaw, max) : null;
    const end = endRaw != null ? clampYmd(endRaw, max) : null;
    if (start != null && end != null && start > end) {
      setDraft({ start: end, end: start });
    } else {
      setDraft({ start, end });
    }
    setRangeVisible(true);
  };

  const onDayPress = (day: DateData) => {
    const s = day.dateString;
    if (s > todayYmd) {
      return;
    }
    setDraft((prev) => {
      if (prev.start == null || (prev.start != null && prev.end != null)) {
        return { start: s, end: null };
      }
      if (s < prev.start) {
        return { start: s, end: prev.start };
      }
      return { start: prev.start, end: s };
    });
  };

  const applyDraftAndClose = () => {
    const max = todayYmd;
    if (draft.start != null && draft.end != null) {
      let lo = draft.start < draft.end ? draft.start : draft.end;
      let hi = draft.start < draft.end ? draft.end : draft.start;
      lo = clampYmd(lo, max);
      hi = clampYmd(hi, max);
      if (lo > hi) {
        hi = lo;
      }
      onChangeOccurredFrom(startOfLocalDay(parseLocalYmd(lo)));
      onChangeOccurredTo(endOfLocalDay(parseLocalYmd(hi)));
    } else if (draft.start != null && draft.end == null) {
      const ymd = clampYmd(draft.start, max);
      const d = parseLocalYmd(ymd);
      onChangeOccurredFrom(startOfLocalDay(d));
      onChangeOccurredTo(endOfLocalDay(d));
    }
    setRangeVisible(false);
  };

  const closeModal = () => {
    setRangeVisible(false);
  };

  const clearInModal = () => {
    onClearOccurredRange();
    setDraft({ start: null, end: null });
    setRangeVisible(false);
  };

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
          style={[
            styles.cameraFab,
            isFilterExpanded ? styles.cameraFabActive : null,
          ]}
        >
          <IconSymbol
            name={
              isFilterExpanded
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle"
            }
            size={22}
            color={isFilterExpanded ? c.onBrand : c.textPrimary}
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
            onPressSearchCenterGps={onPressSearchCenterGps}
            onChangeSearchRadiusMeters={onChangeSearchRadiusMeters}
            onClearSearchGeo={onClearSearchGeo}
            styles={{
              geoBlock: styles.geoBlock,
              geoRow: styles.geoRow,
              geoBtn: styles.geoBtn,
              sliderWithLabels: styles.sliderWithLabels,
              sliderLabelsRow: styles.sliderLabelsRow,
              sliderLabel: styles.sliderLabel,
            }}
          />
        </>
      ) : null}

      <Modal
        visible={rangeVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {screenT("occurredRangeTitle")}
            </ThemedText>
            <ThemedText type="bodyMuted" style={styles.modalHint}>
              {screenT("occurredRangeHint")}
            </ThemedText>
            <Calendar
              markingType="period"
              markedDates={markedDates}
              onDayPress={onDayPress}
              theme={calendarTheme}
              enableSwipeMonths
              current={calendarCurrent}
              maxDate={todayYmd}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={clearInModal}
              >
                <ThemedText type="link">{screenT("occurredClear")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={closeModal}
              >
                <ThemedText type="body">{t("common.cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={applyDraftAndClose}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: c.onBrand }}
                >
                  {screenT("occurredRangeDone")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
