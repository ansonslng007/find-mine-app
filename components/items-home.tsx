import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import {
  passesCategoryChip,
  type TranslateFn,
} from "@/components/lost-items/format";
import { LostItemCard } from "@/components/lost-items/lost-item-card";
import {
  SearchByImageSheet,
  type SheetStatusKind,
} from "@/components/lost-items/search-by-image-sheet";
import { SearchFilterRow } from "@/components/lost-items/search-filter-row";
import { ThemedText } from "@/components/themed-text";
import { PillButton } from "@/components/ui/pill-button";
import { type LostItemCategoryId } from "@/constants/mock-lost-items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useItemsList, useSearchByImageMutation } from "@/hooks/use-items";
import { ApiError } from "@/lib/api/client";
import type { Item, ItemKind } from "@/lib/api/items";
import { searchByText } from "@/lib/api/items";
import { useI18n } from "@/providers/i18n-provider";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageLayoutWithHeader } from "./layout/page-layout-with-header";

type HomeScope = "lostHome" | "foundHome";

type ItemsHomeProps = Readonly<{
  kind: ItemKind;
  scope: HomeScope;
}>;

type LostItemsListEmptyProps = Readonly<{
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  brandColor: string;
  centerBlockStyle: ViewStyle;
  labelErrorStyle: TextStyle;
  emptyTextStyle: TextStyle;
  t: TranslateFn;
  screenT: TranslateFn;
}>;

function LostItemsListEmpty({
  isPending,
  isError,
  error,
  onRetry,
  brandColor,
  centerBlockStyle,
  labelErrorStyle,
  emptyTextStyle,
  t,
  screenT,
}: LostItemsListEmptyProps) {
  const errorMessage =
    error instanceof Error ? error.message : t("common.loadListFailed");

  if (isPending) {
    return (
      <View style={centerBlockStyle}>
        <ActivityIndicator size="large" color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("loading")}</ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={centerBlockStyle}>
        <ThemedText type="labelError" style={labelErrorStyle}>
          {errorMessage}
        </ThemedText>
        <PillButton label={t("common.retry")} onPress={onRetry} />
      </View>
    );
  }

  return (
    <ThemedText type="bodyMuted" style={emptyTextStyle}>
      {screenT("empty")}
    </ThemedText>
  );
}

type SimilarItemsEmptyProps = Readonly<{
  centerBlockStyle: ViewStyle;
  emptyTextStyle: TextStyle;
  screenT: TranslateFn;
}>;

function SimilarItemsEmpty({
  centerBlockStyle,
  emptyTextStyle,
  screenT,
}: SimilarItemsEmptyProps) {
  return (
    <View style={centerBlockStyle}>
      <ThemedText type="bodyMuted" style={emptyTextStyle}>
        {screenT("imageSearchEmpty")}
      </ThemedText>
    </View>
  );
}

type HomeListEmptyProps = Readonly<{
  mode: "normal" | "similar" | "combined";
  centerBlockStyle: ViewStyle;
  emptyTextStyle: TextStyle;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  brandColor: string;
  labelErrorStyle: TextStyle;
  t: TranslateFn;
  screenT: TranslateFn;
}>;

function HomeListEmpty({
  mode,
  centerBlockStyle,
  emptyTextStyle,
  isPending,
  isError,
  error,
  onRetry,
  brandColor,
  labelErrorStyle,
  t,
  screenT,
}: HomeListEmptyProps) {
  if (isPending) {
    return (
      <View style={centerBlockStyle}>
        <ActivityIndicator size="large" color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("loading")}</ThemedText>
      </View>
    );
  }

  if (mode === "similar") {
    return (
      <SimilarItemsEmpty
        centerBlockStyle={centerBlockStyle}
        emptyTextStyle={emptyTextStyle}
        screenT={screenT}
      />
    );
  }

  if (mode === "combined") {
    return (
      <View style={centerBlockStyle}>
        <ThemedText type="bodyMuted" style={emptyTextStyle}>
          {screenT("empty")}
        </ThemedText>
      </View>
    );
  }

  return (
    <LostItemsListEmpty
      isPending={false}
      isError={isError}
      error={error}
      onRetry={onRetry}
      brandColor={brandColor}
      centerBlockStyle={centerBlockStyle}
      labelErrorStyle={labelErrorStyle}
      emptyTextStyle={emptyTextStyle}
      t={t}
      screenT={screenT}
    />
  );
}

type ImageSearchBannerProps = Readonly<{
  onClear: () => void;
  bannerStyle: ViewStyle;
  screenT: TranslateFn;
  resultCount: number;
}>;

function ImageSearchBanner({
  onClear,
  bannerStyle,
  screenT,
  resultCount,
}: ImageSearchBannerProps) {
  return (
    <View style={bannerStyle}>
      <ThemedText type="body" style={{ flex: 1 }}>
        {`${screenT("imageSearchActive")} (${resultCount})`}
      </ThemedText>
      <Pressable onPress={onClear} hitSlop={10}>
        <ThemedText type="link">{screenT("imageSearchClear")}</ThemedText>
      </Pressable>
    </View>
  );
}

export function ItemsHome({ kind, scope }: ItemsHomeProps) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useI18n();
  const homeT = (key: string) => t(`${scope}.${key}`);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LostItemCategoryId>("all");
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [busyKind, setBusyKind] = useState<"idle" | "search">("idle");
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [textResults, setTextResults] = useState<Item[] | null>(null);
  const [textSearchLoading, setTextSearchLoading] = useState(false);

  const { data, isPending, isError, error, refetch, isRefetching } =
    useItemsList({ kind });

  const searchByImageMutation = useSearchByImageMutation();

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        listContent: {
          gap: 12,
        },
        listEmptyGrow: {
          flexGrow: 1,
        },
        centerBlock: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 48,
          gap: 12,
        },
        empty: {
          textAlign: "center",
          marginTop: 32,
        },
        labelError: {
          paddingHorizontal: 16,
        },
        imageSearchBanner: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          paddingHorizontal: 2,
        },
      }),
    [],
  );

  const qTrim = query.trim();

  useEffect(() => {
    if (!qTrim) {
      setTextResults(null);
      setTextSearchLoading(false);
      return;
    }

    let cancelled = false;
    setTextSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchByText({ query: qTrim, kind, limit: 50 });
        if (!cancelled) {
          setTextResults(res.results.map((r) => r.item));
        }
      } catch {
        if (!cancelled) {
          setTextResults([]);
        }
      } finally {
        if (!cancelled) {
          setTextSearchLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [qTrim, kind]);

  const normalFiltered = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((item) => passesCategoryChip(item, category));
  }, [data?.items, category]);

  const similarItems = useMemo(
    () =>
      searchByImageMutation.data?.results.map((result) => result.item) ?? [],
    [searchByImageMutation.data],
  );

  const hasImageSearch = searchByImageMutation.data != null;

  const imageItemsFiltered = useMemo(
    () => similarItems.filter((item) => passesCategoryChip(item, category)),
    [similarItems, category],
  );

  const textItemsFiltered = useMemo(() => {
    if (textResults === null) {
      return null;
    }
    return textResults.filter((item) => passesCategoryChip(item, category));
  }, [textResults, category]);

  const hasTextSearch = qTrim.length > 0;

  const listData = useMemo(() => {
    if (hasTextSearch) {
      if (textItemsFiltered === null) {
        return [];
      }
      if (hasImageSearch) {
        const imageIds = new Set(imageItemsFiltered.map((it) => it.id));
        return textItemsFiltered.filter((it) => imageIds.has(it.id));
      }
      return textItemsFiltered;
    }
    if (hasImageSearch) {
      return imageItemsFiltered;
    }
    if (isPending || isError) {
      return [];
    }
    return normalFiltered;
  }, [
    hasTextSearch,
    hasImageSearch,
    textItemsFiltered,
    imageItemsFiltered,
    isPending,
    isError,
    normalFiltered,
  ]);

  const listEmptyMode: "normal" | "similar" | "combined" = useMemo(() => {
    if (hasTextSearch && hasImageSearch) {
      return "combined";
    }
    if (hasImageSearch) {
      return "similar";
    }
    return "normal";
  }, [hasTextSearch, hasImageSearch]);

  const listShouldGrow = useMemo(() => {
    if (hasTextSearch || hasImageSearch) {
      return listData.length === 0;
    }
    return isPending || isError || normalFiltered.length === 0;
  }, [
    hasTextSearch,
    hasImageSearch,
    listData.length,
    isPending,
    isError,
    normalFiltered.length,
  ]);

  const sheetStatusKind: SheetStatusKind =
    busyKind === "idle" ? "idle" : "search";

  const runImageSearch = async (uri: string, mime: string) => {
    setImageSearchError(null);
    setBusyKind("search");
    try {
      await searchByImageMutation.mutateAsync({
        uri,
        mime,
        kind,
        limit: 50,
      });
      setIsSheetOpen(false);
    } catch (e) {
      if (e instanceof ApiError) {
        setImageSearchError(e.message);
      } else {
        setImageSearchError(homeT("imageSearchFailed"));
      }
    } finally {
      setBusyKind("idle");
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("form.permCameraTitle"), t("form.permCameraBody"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    await runImageSearch(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("form.permGalleryTitle"), t("form.permGalleryBody"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    await runImageSearch(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handleClearImageSearch = () => {
    setImageSearchError(null);
    searchByImageMutation.reset();
  };

  const openSearchSheet = () => {
    setImageSearchError(null);
    setIsSheetOpen(true);
  };

  const closeSearchSheet = () => {
    if (busyKind !== "idle") {
      return;
    }
    setIsSheetOpen(false);
    setImageSearchError(null);
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
  };

  const renderItem = ({ item }: { item: Item }) => <LostItemCard item={item} />;

  const listShowsTextSearch = hasTextSearch;
  const listEmptyPending =
    isPending || (listShowsTextSearch && textSearchLoading);

  const listEmpty = (
    <HomeListEmpty
      mode={listEmptyMode}
      centerBlockStyle={pageStyles.centerBlock}
      emptyTextStyle={pageStyles.empty}
      isPending={listEmptyPending}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      brandColor={c.brand}
      labelErrorStyle={pageStyles.labelError}
      t={t}
      screenT={homeT}
    />
  );

  const isBusy = busyKind !== "idle";

  return (
    <PageLayoutWithHeader
      screenTitle={homeT("title")}
      screenSubtitle={homeT("subtitle")}
      icon="shippingbox.fill"
      useScrollView={false}
    >
      <SearchFilterRow
        query={query}
        onQueryChange={handleQueryChange}
        onPressSearchByImage={openSearchSheet}
        isCategoryExpanded={isCategoryExpanded}
        onToggleCategoryExpanded={() => setIsCategoryExpanded((prev) => !prev)}
        scope={scope}
      />
      {isCategoryExpanded ? (
        <CategoryChipRow category={category} onCategoryChange={setCategory} />
      ) : null}

      <SearchByImageSheet
        visible={isSheetOpen}
        onClose={closeSearchSheet}
        onTakePhoto={handleTakePhoto}
        onPickLibrary={handlePickFromLibrary}
        isBusy={isBusy}
        statusKind={sheetStatusKind}
        errorMessage={imageSearchError}
        scope={scope}
      />

      {hasImageSearch ? (
        <ImageSearchBanner
          onClear={handleClearImageSearch}
          bannerStyle={pageStyles.imageSearchBanner}
          screenT={homeT}
          resultCount={listData.length}
        />
      ) : null}

      <FlatList
        data={listData}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={[
          pageStyles.listContent,
          { paddingBottom: insets.bottom + 100 },
          listShouldGrow && pageStyles.listEmptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isPending}
            onRefresh={() => refetch()}
            tintColor={c.brand}
          />
        }
      />
    </PageLayoutWithHeader>
  );
}
