import { SearchFilterModal } from "@/components/lost-items/search-filter-modal";
import type { SearchGeoState } from "@/components/lost-items/search-filter-modal";
import type { MapPickLocationModalProps } from "@/components/modal/map-pick-location-modal";
import type { LocationPickChange } from "@/components/location/location-pick-field";
import { AppTextField } from "@/components/ui/app-text-field";
import { IconButton } from "@/components/ui/icon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { LostItemCategoryId } from "@/constants/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Props = Readonly<{
  query: string;
  onQueryChange: (q: string) => void;
  onPressSearchByImage: () => void;
  hasActiveFilter: boolean;
  filterModalVisible: boolean;
  onOpenFilterModal: () => void;
  onCloseFilterModal: () => void;
  onApplyFilter: () => void;
  onResetFilterDraft: () => void;
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

export function SearchFilterRow({
  query,
  onQueryChange,
  onPressSearchByImage,
  hasActiveFilter,
  filterModalVisible,
  onOpenFilterModal,
  onCloseFilterModal,
  onApplyFilter,
  onResetFilterDraft,
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
  const { t } = useI18n();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: 0,
        },
        searchRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        searchField: {
          flex: 1,
        },
        actionBtn: {
          width: 48,
          height: 48,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.cardBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
        },
        actionBtnActive: {
          backgroundColor: c.brand,
          borderColor: c.brand,
        },
        activeBadge: {
          position: "absolute",
          right: 7,
          top: 7,
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: "#1f883d",
          borderWidth: 1,
          borderColor: c.cardBackground,
        },
      }),
    [c],
  );

  let filterIconColor = c.textPrimary;
  let filterBtnStyle: object | null = null;

  if (hasActiveFilter && filterModalVisible) {
    filterBtnStyle = { backgroundColor: "#1f883d", borderColor: "#1f883d" };
    filterIconColor = "#fff";
  } else if (hasActiveFilter) {
    filterIconColor = "#1f883d";
  } else if (filterModalVisible) {
    filterBtnStyle = styles.actionBtnActive;
    filterIconColor = c.onBrand;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <AppTextField
          containerStyle={styles.searchField}
          leftIcon={
            <IconSymbol name="magnifyingglass" size={20} color={c.textMuted} />
          }
          placeholder={t(`${scope}.searchPlaceholder`)}
          value={query}
          onChangeText={onQueryChange}
          onClear={() => onQueryChange("")}
          returnKeyType="search"
        />
        <Pressable
          style={styles.actionBtn}
          onPress={onPressSearchByImage}
          accessibilityRole="button"
        >
          <IconSymbol name="camera.fill" size={22} color={c.textPrimary} />
        </Pressable>
        <IconButton
          onPress={onOpenFilterModal}
          style={[styles.actionBtn, filterBtnStyle]}
          borderRadius={8}
          accessibilityRole="button"
        >
          <IconSymbol
            name={
              filterModalVisible || hasActiveFilter
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle"
            }
            size={22}
            color={filterIconColor}
          />
          {hasActiveFilter ? <View style={styles.activeBadge} /> : null}
        </IconButton>
      </View>

      <SearchFilterModal
        visible={filterModalVisible}
        onClose={onCloseFilterModal}
        onApply={onApplyFilter}
        onReset={onResetFilterDraft}
        scope={scope}
        category={category}
        onCategoryChange={onCategoryChange}
        occurredFrom={occurredFrom}
        occurredTo={occurredTo}
        onChangeOccurredFrom={onChangeOccurredFrom}
        onChangeOccurredTo={onChangeOccurredTo}
        onClearOccurredRange={onClearOccurredRange}
        searchGeo={searchGeo}
        onPressPickSearchCenterMap={onPressPickSearchCenterMap}
        onSearchLocationChange={onSearchLocationChange}
        onChangeSearchRadiusMeters={onChangeSearchRadiusMeters}
        onClearSearchGeo={onClearSearchGeo}
        mapPickModal={mapPickModal}
      />
    </View>
  );
}
