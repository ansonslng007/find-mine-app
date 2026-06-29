import { LocationPickField } from "@/components/location/location-pick-field";
import { CategoryPickerModal } from "@/components/modal/category-picker-modal";
import { DatePickerModal } from "@/components/modal/date-picker-modal";
import { MapPickLocationModal } from "@/components/modal/map-pick-location-modal";
import { SearchByImageSheet } from "@/components/modal/search-by-image-sheet";
import { AppButton } from "@/components/ui/app-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LOST_ITEM_CATEGORY_IDS } from "@/constants/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useCreateItem } from "@/hooks/use-create-item";
import { useUpdateItem } from "@/hooks/use-update-item";
import { ApiError } from "@/lib/api/client";
import type { Item, ItemKind } from "@/lib/api/items";
import { analyzeItemImage } from "@/lib/api/items";
import { buildReadableAddressFromNominatim } from "@/lib/nominatim-readable-address";
import { useOptionalFabUploadSheet } from "@/providers/fab-upload-sheet-provider";
import { useI18n } from "@/providers/i18n-provider";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ScrollView,
} from "react-native";
import { PageLayoutWithHeader } from "./layout/page-layout-with-header";
import { ThemedText } from "./themed-text";

import type { PlaceGeometry } from "@/lib/places-geometry";

const SUBMIT_CATEGORY_IDS = new Set<string>(
  LOST_ITEM_CATEGORY_IDS.filter((id) => id !== "all"),
);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseOccurredAtIso(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  if (!DATE_ONLY_RE.test(t)) return undefined;
  const [yearRaw, monthRaw, dayRaw] = t.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const d = new Date(year, month - 1, day);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() + 1 !== month ||
    d.getDate() !== day
  ) {
    return undefined;
  }
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  ).toISOString();
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function imageMimeToFileName(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "upload.png";
  if (m.includes("webp")) return "upload.webp";
  return "upload.jpg";
}

function occurredAtIsoToDateInput(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDateInputValue(d);
}

function formatRewardForInput(amount: number | null | undefined): string {
  if (amount == null || amount === 0) {
    return "0";
  }
  return String(amount);
}

function sanitizeRewardInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) {
    return cleaned;
  }
  return `${cleaned.slice(0, dot)}.${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function parseRewardInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
}

export type LostItemFormProps =
  | { mode?: "create" }
  | { mode: "edit"; itemId: string; initialItem: Item };

export function LostItemForm(props: LostItemFormProps = {}) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const { pendingDraft, consumeDraft } = useOptionalFabUploadSheet();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageIsLocal, setImageIsLocal] = useState(false);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [pickedOccurredAt, setPickedOccurredAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeInputError, setTimeInputError] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [kind, setKind] = useState<ItemKind>("lost");
  const [rewardInput, setRewardInput] = useState("0");
  const [description, setDescription] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [placeGeometry, setPlaceGeometry] = useState<PlaceGeometry | null>(
    null,
  );
  const [mapPickVisible, setMapPickVisible] = useState(false);
  const c = useAppColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createLostItemFormStyles(), []);

  const [objectHint, setObjectHint] = useState("");
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const formScrollRef = useRef<ScrollView | null>(null);

  const [backendFillSnapshot, setBackendFillSnapshot] = useState<{
    category: string;
    description: string;
    title?: string;
  } | null>(null);

  useEffect(() => {
    setObjectHint(t("form.categoryHintDefault"));
  }, [t, locale]);

  useEffect(() => {
    if (!isEdit || props.mode !== "edit") {
      return;
    }
    const item = props.initialItem;
    setImageUri(item.imageUrl);
    setExistingImageUrl(item.imageUrl);
    setImageIsLocal(false);
    setImageMime("image/jpeg");
    setTitle(item.title);
    setKind(item.kind);
    setRewardInput(formatRewardForInput(item.rewardAmount));
    setDescription(item.description?.trim() ?? "");
    const cat = item.category?.trim() ?? "";
    setCategory(SUBMIT_CATEGORY_IDS.has(cat) ? cat : "other");
    setLocation(item.locationText?.trim() ?? "");
    const lat = item.locationLatitude;
    const lng = item.locationLongitude;
    if (
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      setPlaceGeometry({ location: { lat, lng } });
    } else {
      setPlaceGeometry(null);
    }
    const dateStr = occurredAtIsoToDateInput(item.occurredAt);
    setTime(dateStr);
    setPickedOccurredAt(
      dateStr ? new Date(parseOccurredAtIso(dateStr) ?? Date.now()) : null,
    );
    setTimeInputError("");
    setObjectHint(cat ? t(`categories.${cat}`) : t("form.categoryHintDefault"));
  }, [isEdit, props, t]);

  useEffect(() => {
    if (isEdit || !pendingDraft) {
      return;
    }
    const d = pendingDraft;
    setImageUri(d.imageUri);
    setImageMime(d.imageMime);
    setCategory(d.category);
    setDescription(d.description);
    if (d.title?.trim()) {
      setTitle(d.title.trim());
    }
    setObjectHint(t("form.categoryHintDefault"));
    setBackendFillSnapshot({
      category: d.category,
      description: d.description,
      ...(d.title?.trim() ? { title: d.title.trim() } : {}),
    });
    consumeDraft();
  }, [pendingDraft, consumeDraft, t]);

  const handleClearBackendFill = () => {
    const snap = backendFillSnapshot;
    setCategory("");
    setDescription("");
    if (snap?.title != null && title.trim() === snap.title) {
      setTitle("");
    }
    setObjectHint(t("form.categoryHintDefault"));
    setBackendFillSnapshot(null);
  };

  const handleRemovePhoto = () => {
    if (loading) {
      return;
    }
    if (isEdit && existingImageUrl) {
      if (imageIsLocal) {
        setImageUri(existingImageUrl);
        setImageIsLocal(false);
        setImageMime("image/jpeg");
      }
      setSubmitMessage("");
      setSubmitError("");
      return;
    }
    setImageUri(null);
    setExistingImageUrl(null);
    setImageIsLocal(false);
    setImageMime("image/jpeg");
    setCategory("");
    setDescription("");
    setTitle("");
    setObjectHint(t("form.categoryHintDefault"));
    setBackendFillSnapshot(null);
    setSubmitMessage("");
    setSubmitError("");
  };

  const resetFormState = () => {
    setImageUri(null);
    setExistingImageUrl(null);
    setImageIsLocal(false);
    setImageMime("image/jpeg");
    setTitle("");
    setTime("");
    setPickedOccurredAt(null);
    setShowDatePicker(false);
    setTimeInputError("");
    setLocation("");
    setCategory("");
    setKind("lost");
    setRewardInput("0");
    setDescription("");
    setSubmitMessage("");
    setSubmitError("");
    setPlaceGeometry(null);
    setMapPickVisible(false);
    setObjectHint(t("form.categoryHintDefault"));
    setBackendFillSnapshot(null);
  };

  const handleOpenDatePicker = () => {
    if (!pickedOccurredAt) {
      const parsedIso = parseOccurredAtIso(time);
      setPickedOccurredAt(parsedIso ? new Date(parsedIso) : new Date());
    }
    setShowDatePicker(true);
  };

  const handleDatePickerConfirm = (selectedDate: Date) => {
    const now = new Date();
    const safeDate =
      selectedDate.getTime() > now.getTime() ? now : selectedDate;
    setPickedOccurredAt(safeDate);
    setTime(formatDateInputValue(safeDate));
    setTimeInputError("");
    setShowDatePicker(false);
  };

  const handleCalendarDayPress = (day: { dateString: string }) => {
    const iso = parseOccurredAtIso(day.dateString);
    if (!iso) return;
    const selectedDate = new Date(iso);
    handleDatePickerConfirm(selectedDate);
  };

  const validateDateInput = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (!DATE_ONLY_RE.test(trimmed)) return t("form.timeInvalidFormat");
    const iso = parseOccurredAtIso(trimmed);
    if (!iso) return t("form.timeInvalidDate");
    const chosenDate = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (chosenDate.getTime() > today.getTime()) {
      return t("form.timeAfterToday");
    }
    return "";
  };

  const handleTimeChange = (next: string) => {
    setTime(next);
    const err = validateDateInput(next);
    setTimeInputError(err);
    if (!err) {
      const iso = parseOccurredAtIso(next);
      setPickedOccurredAt(iso ? new Date(iso) : null);
    }
  };

  const generateReadableAddressFromNominatim = (
    address: unknown,
    name: string,
    latitude: number,
    longitude: number,
  ) =>
    buildReadableAddressFromNominatim(address, name, latitude, longitude, {
      locale,
      translate: t,
    });

  const analyzePhotoFromUri = async (uri: string, mime: string) => {
    setLoading(true);
    setSubmitMessage("");
    setSubmitError("");
    try {
      const analysis = await analyzeItemImage({ uri, mime, locale });
      setCategory(analysis.category);
      setDescription(analysis.description);
      if (analysis.title?.trim()) {
        setTitle(analysis.title.trim());
      }
      setObjectHint(t(`categories.${analysis.category}`));
      setBackendFillSnapshot({
        category: analysis.category,
        description: analysis.description,
        ...(analysis.title?.trim() ? { title: analysis.title.trim() } : {}),
      });
    } catch (error) {
      console.error("analyzeItemImage error", error);
      setObjectHint(t("form.classifyFail"));
    } finally {
      setLoading(false);
    }
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
    const uri = asset.uri;
    setImageUri(uri);
    setImageIsLocal(true);
    setImageMime(asset.mimeType ?? "image/jpeg");
    await analyzePhotoFromUri(uri, asset.mimeType ?? "image/jpeg");
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
    const uri = asset.uri;
    setImageUri(uri);
    setImageIsLocal(true);
    setImageMime(asset.mimeType ?? "image/jpeg");
    await analyzePhotoFromUri(uri, asset.mimeType ?? "image/jpeg");
  };

  /** Opening the camera right after the modal closes is often ignored on device; wait for interaction/animation to finish, then delay slightly. */
  const closeUploadSheetThen = (run: () => void) => {
    setUploadSheetVisible(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(run, 320);
    });
  };

  const handleSheetTakePhoto = () => {
    closeUploadSheetThen(() => {
      void handleTakePhoto();
    });
  };

  const handleSheetPickLibrary = () => {
    closeUploadSheetThen(() => {
      void handlePickFromLibrary();
    });
  };

  const uploadSheetScope = kind === "found" ? "foundHome" : "lostHome";

  const handleSubmit = () => {
    formScrollRef.current?.scrollTo({ y: 0, animated: true });
    setSubmitMessage("");
    setSubmitError("");

    if (!imageUri) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needImage"));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needTitle"));
      return;
    }
    if (!time.trim()) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needTime"));
      return;
    }
    const cat = category.trim();
    if (!cat || !SUBMIT_CATEGORY_IDS.has(cat)) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needCategory"));
      return;
    }

    const occurredAt = parseOccurredAtIso(time);
    if (time.trim() && (!occurredAt || timeInputError)) {
      setTimeInputError(validateDateInput(time));
      return;
    }
    const occurredAtValue = occurredAt;
    if (!occurredAtValue) {
      setTimeInputError(validateDateInput(time));
      return;
    }

    const sharedFields = {
      kind,
      title: title.trim(),
      category: cat,
      description: description.trim() || undefined,
      locationText: location.trim() || undefined,
      ...(placeGeometry != null
        ? {
            locationLatitude: placeGeometry.location.lat,
            locationLongitude: placeGeometry.location.lng,
          }
        : {}),
      occurredAt: occurredAtValue,
      ...(kind === "lost"
        ? { rewardAmount: parseRewardInput(rewardInput) }
        : {}),
    };

    const onMutationError = (e: Error) => {
      const msg =
        e instanceof ApiError
          ? `${e.code}：${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setSubmitError(msg);
    };

    if (isEdit && props.mode === "edit") {
      updateItemMutation.mutate(
        {
          itemId: props.itemId,
          ...sharedFields,
          ...(imageIsLocal && imageUri
            ? {
                image: {
                  uri: imageUri,
                  name: imageMimeToFileName(imageMime),
                  type: imageMime || "image/jpeg",
                },
              }
            : {}),
        },
        {
          onSuccess: () => {
            router.back();
          },
          onError: onMutationError,
        },
      );
      return;
    }

    const formData = {
      ...sharedFields,
      image: {
        uri: imageUri,
        name: imageMimeToFileName(imageMime),
        type: imageMime || "image/jpeg",
      },
    } as const;
    createItemMutation.mutate(formData, {
      onSuccess: (data) => {
        setSubmitMessage(
          t("form.submitSuccess", {
            kind: kind === "lost" ? t("form.kindLost") : t("form.kindFound"),
            id: data.item.id,
            time: time.trim() || t("common.notProvided"),
            location: location.trim() || t("common.notProvided"),
            category: category.trim() || t("common.notProvided"),
          }),
        );
        resetFormState();
        router.replace(formData.kind === "found" ? "/(tabs)/found" : "/(tabs)");
      },
      onError: onMutationError,
    });
  };

  const submitPending =
    createItemMutation.isPending || updateItemMutation.isPending;

  const handleLocationPickChange = (value: {
    label: string;
    lat: number;
    lng: number;
  }) => {
    setLocation(value.label);
    setPlaceGeometry({ location: { lat: value.lat, lng: value.lng } });
  };

  const handleLocationTextChange = (text: string) => {
    setLocation(text);
    if (!text.trim()) {
      setPlaceGeometry(null);
      return;
    }
    setPlaceGeometry(null);
  };

  const titleLabel =
    kind === "lost" ? t("form.titleLost") : t("form.titleFound");
  const timeLabel = kind === "lost" ? t("form.timeLost") : t("form.timeFound");
  const locationLabel =
    kind === "lost" ? t("form.locationLost") : t("form.locationFound");

  const screenTitle = isEdit ? t("edit.title") : t("form.screenTitle");
  const screenSubtitle = isEdit ? t("edit.subtitle") : t("form.screenSubtitle");
  const submitLabel = isEdit
    ? t("edit.save")
    : kind === "lost"
      ? t("form.submitLost")
      : t("form.submitFound");

  return (
    <PageLayoutWithHeader
      screenTitle={screenTitle}
      screenSubtitle={screenSubtitle}
      icon="shippingbox.fill"
      scrollViewRef={formScrollRef}
    >
      {isEdit ? (
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backRow,
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <IconSymbol name="chevron.left" size={22} color={c.brand} />
          <ThemedText style={[styles.backLabel, { color: c.brand }]}>
            {t("detail.back")}
          </ThemedText>
        </Pressable>
      ) : null}
      {backendFillSnapshot != null ? (
        <View style={styles.formTopBar}>
          <Pressable
            onPress={handleClearBackendFill}
            hitSlop={12}
            style={({ pressed }) => [
              styles.formTopBarClearPressable,
              pressed ? { opacity: 0.82 } : null,
            ]}
          >
            <IconSymbol name="trash.fill" size={18} color={c.brand} />
            <ThemedText type="link" style={{ color: c.brand }}>
              {t("form.clearData")}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.segmentWrap, { backgroundColor: c.chipBackground }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            kind === "lost" && { backgroundColor: c.badgeLost },
          ]}
          onPress={() => setKind("lost")}
          activeOpacity={0.85}
        >
          <Text
            style={
              kind === "lost"
                ? styles.segmentLabelOnLight
                : [styles.segmentLabelMuted, { color: c.textMuted }]
            }
          >
            {t("form.segmentLost")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            kind === "found" && { backgroundColor: c.badgeFound },
          ]}
          onPress={() => setKind("found")}
          activeOpacity={0.85}
        >
          <Text
            style={
              kind === "found"
                ? styles.segmentLabelOnLight
                : [styles.segmentLabelMuted, { color: c.textMuted }]
            }
          >
            {t("form.segmentFound")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {titleLabel}
          </Text>
          <Text style={[styles.requiredStar, { color: c.brand }]}>*</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: c.chipBackground,
              color: c.textPrimary,
              borderColor: c.borderSubtle,
            },
          ]}
          placeholder={t("form.titlePlaceholder")}
          placeholderTextColor={c.placeholder}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <IconSymbol name="calendar" size={18} color={c.textMuted} />
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {timeLabel}
          </Text>
          <Text style={[styles.requiredStar, { color: c.brand }]}>*</Text>
        </View>
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: c.chipBackground,
              borderColor: c.borderSubtle,
            },
          ]}
        >
          <TextInput
            style={[styles.inputBare, { color: c.textPrimary }]}
            placeholder={t("form.timePlaceholder")}
            placeholderTextColor={c.placeholder}
            value={time}
            onChangeText={handleTimeChange}
          />
          <TouchableOpacity onPress={handleOpenDatePicker} activeOpacity={0.7}>
            <IconSymbol name="calendar" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>
        {timeInputError ? (
          <ThemedText style={[styles.hint, { color: c.danger }]}>
            {timeInputError}
          </ThemedText>
        ) : null}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          currentDate={formatDateInputValue(pickedOccurredAt ?? new Date())}
          maxDate={formatDateInputValue(new Date())}
          selectedDateString={time && !timeInputError ? time : undefined}
          onDayPress={handleCalendarDayPress}
        />
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <IconSymbol name="mappin.circle.fill" size={18} color={c.textMuted} />
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {locationLabel}
          </Text>
        </View>

        <LocationPickField
          addressLabel={location}
          onLocationChange={handleLocationPickChange}
          onAddressTextChange={handleLocationTextChange}
          onPressPickOnMap={() => setMapPickVisible(true)}
        />
      </View>

      {kind === "lost" ? (
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.labelText, { color: c.textPrimary }]}>
              {t("form.rewardLabel")}
            </Text>
          </View>
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: c.chipBackground,
                borderColor: c.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.rewardPrefix, { color: c.textMuted }]}>
              {t("form.rewardPrefix")}
            </Text>
            <TextInput
              style={[styles.inputBare, { color: c.textPrimary }]}
              placeholder={t("form.rewardPlaceholder")}
              placeholderTextColor={c.placeholder}
              value={rewardInput}
              onChangeText={(text) => setRewardInput(sanitizeRewardInput(text))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      ) : null}

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {t("form.categoryLabel")}
          </Text>
          <Text style={[styles.requiredStar, { color: c.brand }]}>*</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.inputShell,
            {
              backgroundColor: c.chipBackground,
              borderColor: c.borderSubtle,
            },
          ]}
          onPress={() => setCategoryModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.inputBare,
              { color: category ? c.textPrimary : c.placeholder },
            ]}
          >
            {category
              ? t(`categories.${category}`)
              : t("form.categoryPlaceholder")}
          </Text>
          <IconSymbol name="chevron.down" size={22} color={c.textMuted} />
        </TouchableOpacity>
        <ThemedText style={[styles.hint, { color: c.textMuted }]}>
          {objectHint}
        </ThemedText>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.labelText, { color: c.textPrimary }]}>
          {t("form.notesLabel")}
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: c.chipBackground,
              color: c.textPrimary,
              borderColor: c.borderSubtle,
            },
          ]}
          placeholder={t("form.notesPlaceholder")}
          placeholderTextColor={c.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.uploadSection}>
        <View style={styles.labelRow}>
          <IconSymbol name="camera.fill" size={18} color={c.textMuted} />
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {t("form.photoLabel")}
          </Text>
          <Text style={[styles.requiredStar, { color: c.brand }]}>*</Text>
        </View>
        {imageUri ? (
          <View
            style={[
              styles.photoThumbRow,
              {
                borderColor: c.borderSubtle,
                backgroundColor: c.cardBackground,
              },
            ]}
          >
            <View
              style={[
                styles.photoThumbWrap,
                { backgroundColor: c.imagePlaceholder },
              ]}
            >
              <ExpoImage
                source={{ uri: imageUri }}
                style={styles.photoThumbImage}
                contentFit="cover"
              />
            </View>
            <View style={styles.photoThumbSide}>
              <ThemedText type="caption" style={{ color: c.textMuted }}>
                {t("form.replacePhotoHint")}
              </ThemedText>
              <Pressable
                onPress={handleRemovePhoto}
                disabled={loading}
                style={({ pressed }) => {
                  let opacity = 1;
                  if (loading) {
                    opacity = 0.45;
                  } else if (pressed) {
                    opacity = 0.82;
                  }
                  return [
                    styles.removePhotoPressable,
                    {
                      borderColor: c.danger,
                      opacity,
                    },
                  ];
                }}
              >
                <IconSymbol name="trash.fill" size={18} color={c.danger} />
                <Text style={[styles.removePhotoLabel, { color: c.danger }]}>
                  {t("form.removePhoto")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View>
          <AppButton
            label={loading ? t("form.analyzingPhoto") : t("form.uploadImageButton")}
            onPress={() => setUploadSheetVisible(true)}
            disabled={loading}
            loading={loading}
            fullWidth
            leftIcon={
              <IconSymbol
                name="photo.on.rectangle"
                size={18}
                color={c.onBrand}
              />
            }
            />
        </View>
      </View>

      <MapPickLocationModal
        visible={mapPickVisible}
        onClose={() => setMapPickVisible(false)}
        onConfirm={(p) => {
          handleLocationPickChange({
            label: p.addressLabel,
            lat: p.lat,
            lng: p.lng,
          });
          setMapPickVisible(false);
        }}
        initialCenter={placeGeometry?.location ?? null}
        locale={locale}
        formatAddressFromNominatim={generateReadableAddressFromNominatim}
        title={t("form.mapPickTitle")}
        confirmLabel={t("form.mapPickConfirm")}
        addressLoadingLabel={t("form.mapPickAddressLoading")}
        addressAnalyzingLabel={t("form.mapPickAddressAnalyzing")}
        reverseFailLabel={t("form.mapPickReverseFail")}
        dragHint={t("form.mapPickDragHint")}
        pinHint={t("form.mapPickPinHint")}
        permissionDeniedTitle={t("form.permLocationTitle")}
        permissionDeniedBody={t("form.permLocationBody")}
        locationFailedTitle={t("form.locationFailedTitle")}
        locationFailedBody={t("form.locationFailedBody")}
      />

      <SearchByImageSheet
        visible={uploadSheetVisible}
        onClose={() => setUploadSheetVisible(false)}
        onTakePhoto={handleSheetTakePhoto}
        onPickLibrary={handleSheetPickLibrary}
        isBusy={false}
        statusKind="idle"
        errorMessage={null}
        presentation="itemPost"
        scope={uploadSheetScope}
      />

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: c.brand },
          submitPending && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitPending}
      >
        {submitPending ? (
          <ActivityIndicator color={c.onBrand} />
        ) : (
          <Text style={[styles.submitButtonText, { color: c.onBrand }]}>
            {submitLabel}
          </Text>
        )}
      </TouchableOpacity>

      {submitMessage ? (
        <ThemedText style={[styles.submitMessage, { color: c.textPrimary }]}>
          {submitMessage}
        </ThemedText>
      ) : null}
      {submitError ? (
        <ThemedText style={[styles.submitError, { color: c.danger }]}>
          {submitError}
        </ThemedText>
      ) : null}

      <CategoryPickerModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(id) => {
          setCategory(id);
          setCategoryModalVisible(false);
        }}
        suggestedCategory={backendFillSnapshot?.category}
      />
    </PageLayoutWithHeader>
  );
}

function createLostItemFormStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    backLabel: {
      fontSize: 16,
      marginLeft: 4,
    },
    formTopBar: {
      width: "100%",
      alignItems: "flex-end",
    },
    formTopBarClearPressable: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    segmentWrap: {
      flexDirection: "row",
      borderRadius: 14,
      padding: 4,
      marginBottom: 22,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentLabelOnLight: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    segmentLabelMuted: {
      fontSize: 15,
      fontWeight: "600",
    },
    formGroup: {
      marginBottom: 18,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    labelText: {
      fontSize: 14,
      fontWeight: "600",
    },
    requiredStar: {
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 2,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
    },
    inputShell: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 999,
      paddingRight: 12,
      paddingLeft: 4,
      minHeight: 48,
    },
    inputBare: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 15,
    },
    rewardPrefix: {
      fontSize: 15,
      fontWeight: "600",
      paddingLeft: 12,
      paddingRight: 4,
    },
    textArea: {
      minHeight: 120,
      borderRadius: 16,
      textAlignVertical: "top",
      paddingTop: 14,
    },
    hint: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
    },
    uploadSection: {
      marginBottom: 16,
    },
    photoThumbRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 12,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 12,
    },
    photoThumbWrap: {
      width: 96,
      height: 96,
      borderRadius: 12,
      overflow: "hidden",
    },
    photoThumbImage: {
      width: "100%",
      height: "100%",
    },
    photoThumbSide: {
      flex: 1,
      gap: 10,
      minWidth: 0,
    },
    removePhotoPressable: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    removePhotoLabel: {
      fontSize: 15,
      fontWeight: "600",
    },
    submitButton: {
      paddingVertical: 16,
      borderRadius: 999,
      alignItems: "center",
      marginTop: 4,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "700",
    },
    submitMessage: {
      marginTop: 14,
      fontSize: 14,
      textAlign: "center",
    },
    submitError: {
      marginTop: 14,
      fontSize: 14,
      textAlign: "center",
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    calendarModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    calendarModalCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
      paddingBottom: 8,
    },
  });
}
