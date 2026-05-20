import { SearchFilterModal } from "@/components/lost-items/search-filter-modal";
import type { SearchGeoState } from "@/components/lost-items/search-filter-modal";
import type { MapPickLocationModalProps } from "@/components/modal/map-pick-location-modal";
import type { LocationPickChange } from "@/components/location/location-pick-field";
import { IconButton } from "@/components/ui/icon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { LostItemCategoryId } from "@/constants/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

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
          marginBottom: 14,
        },
        searchRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
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
    filterBtnStyle = styles.cameraFabActive;
    filterIconColor = c.onBrand;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
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
          onPress={onOpenFilterModal}
          style={[styles.cameraFab, filterBtnStyle]}
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
