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
import { useItemsList, useSearchSimilarMutation } from "@/hooks/use-items";
import { ApiError } from "@/lib/api/client";
import type { Item, ItemKind } from "@/lib/api/items";
import { classifyImageFromUri, initMobilenet } from "@/lib/mobilenet-runner";
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

const MODEL_VERSION = "mobilenet-v1";
const EMBEDDING_DIM = 1024;
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
  mode: "normal" | "similar";
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
  if (mode === "similar") {
    return (
      <SimilarItemsEmpty
        centerBlockStyle={centerBlockStyle}
        emptyTextStyle={emptyTextStyle}
        screenT={screenT}
      />
    );
  }

  return (
    <LostItemsListEmpty
      isPending={isPending}
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
  const [mode, setMode] = useState<"normal" | "similar">("normal");
  const [busyKind, setBusyKind] = useState<"idle" | "classify" | "search">(
    "idle",
  );
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch, isRefetching } =
    useItemsList({ kind });

  const searchSimilarMutation = useSearchSimilarMutation();

  useEffect(() => {
    initMobilenet().catch(() => {});
  }, []);

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

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!passesCategoryChip(item, category)) return false;
      if (!q) return true;
      const desc = item.description ?? "";
      const hay = `${item.title} ${desc}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data?.items, query, category]);

  const similarItems = useMemo(
    () =>
      searchSimilarMutation.data?.results.map((result) => result.item) ?? [],
    [searchSimilarMutation.data],
  );

  const listData = useMemo(() => {
    if (mode === "similar") {
      return similarItems;
    }
    if (isPending || isError) {
      return [];
    }
    return filtered;
  }, [mode, similarItems, isPending, isError, filtered]);

  const listShouldGrow = useMemo(() => {
    if (mode === "similar") {
      return similarItems.length === 0;
    }
    return isPending || isError || filtered.length === 0;
  }, [mode, similarItems.length, isPending, isError, filtered.length]);

  const sheetStatusKind: SheetStatusKind =
    busyKind === "idle" ? "idle" : busyKind;

  const classifyWithRetry = async (uri: string): Promise<number[]> => {
    try {
      const { featureVector } = await classifyImageFromUri(uri);
      if (featureVector.length !== EMBEDDING_DIM) {
        throw new Error("embedding_dim");
      }
      return featureVector;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("尚未載入")) {
        await initMobilenet();
        const { featureVector } = await classifyImageFromUri(uri);
        if (featureVector.length !== EMBEDDING_DIM) {
          throw new Error("embedding_dim");
        }
        return featureVector;
      }
      throw e;
    }
  };

  const runImageSearch = async (uri: string) => {
    setImageSearchError(null);
    setBusyKind("classify");
    let embedding: number[];
    try {
      embedding = await classifyWithRetry(uri);
    } catch {
      setImageSearchError(t("form.classifyFail"));
      setBusyKind("idle");
      return;
    }

    setBusyKind("search");
    try {
      const res = await searchSimilarMutation.mutateAsync({
        embedding,
        modelVersion: MODEL_VERSION,
        kind,
        limit: 50,
      });
      console.log("search-similar results:", res.results);
      setMode("similar");
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

    await runImageSearch(result.assets[0].uri);
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

    await runImageSearch(result.assets[0].uri);
  };

  const handleClearImageSearch = () => {
    setMode("normal");
    setImageSearchError(null);
    searchSimilarMutation.reset();
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

  const renderItem = ({ item }: { item: Item }) => <LostItemCard item={item} />;

  const listEmpty = (
    <HomeListEmpty
      mode={mode}
      centerBlockStyle={pageStyles.centerBlock}
      emptyTextStyle={pageStyles.empty}
      isPending={isPending}
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
        onQueryChange={setQuery}
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

      {mode === "similar" ? (
        <ImageSearchBanner
          onClear={handleClearImageSearch}
          bannerStyle={pageStyles.imageSearchBanner}
          screenT={homeT}
          resultCount={similarItems.length}
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
