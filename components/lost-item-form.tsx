import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useCreateItem } from "@/hooks/use-create-item";
import { ApiError } from "@/lib/api/client";
import type { ItemKind } from "@/lib/api/items";
import {
  classifyImageFromUri,
  disposeMobilenet,
  initMobilenet,
} from "@/lib/mobilenet-runner";
import { useFabUploadSheet } from "@/providers/fab-upload-sheet-provider";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Calendar } from "react-native-calendars";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useI18n } from "@/providers/i18n-provider";
import { PageLayoutWithHeader } from "./layout/page-layout-with-header";
import { ThemedText } from "./themed-text";

interface ImageLabelPrediction {
  className: string;
  probability: number;
}

interface PredictionResult {
  className: string;
  probability: number;
}

/** Geometry returned from Place Details (location + optional viewport). */
interface PlaceGeometry {
  location: { lat: number; lng: number };
  viewport?: unknown;
}

/** Parse geometry from `details` in `onPress(data, details)` (i.e. `result`). */
function extractPlaceGeometry(details: unknown): PlaceGeometry | null {
  if (!details || typeof details !== "object") {
    return null;
  }
  const d = details as { geometry?: unknown };
  const geometry = d.geometry;
  if (!geometry || typeof geometry !== "object") {
    return null;
  }
  const g = geometry as {
    location?: unknown;
    viewport?: unknown;
  };
  if (!g.location || typeof g.location !== "object") {
    return null;
  }
  const loc = g.location as { lat?: unknown; lng?: unknown };
  const rawLat = loc.lat;
  const rawLng = loc.lng;
  const lat =
    typeof rawLat === "function"
      ? (rawLat as () => number)()
      : typeof rawLat === "number"
        ? rawLat
        : Number(rawLat);
  const lng =
    typeof rawLng === "function"
      ? (rawLng as () => number)()
      : typeof rawLng === "number"
        ? rawLng
        : Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    location: { lat, lng },
    viewport: g.viewport,
  };
}

const EMBEDDING_DIM = 1024;
const MODEL_VERSION = "mobilenet-v1";
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

export function LostItemForm() {
  const router = useRouter();
  const createItemMutation = useCreateItem();
  const { pendingDraft, consumeDraft } = useFabUploadSheet();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [featureVector, setFeatureVector] = useState<number[] | null>(null);
  const [title, setTitle] = useState("");
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [time, setTime] = useState("");
  const [pickedOccurredAt, setPickedOccurredAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeInputError, setTimeInputError] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<ItemKind>("lost");
  const [description, setDescription] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [lastFeatureDim, setLastFeatureDim] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [placeGeometry, setPlaceGeometry] = useState<PlaceGeometry | null>(
    null,
  );
  const [
    GooglePlacesAutocompleteComponent,
    setGooglePlacesAutocompleteComponent,
  ] = useState<React.ComponentType<any> | null>(null);
  const c = useAppColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createLostItemFormStyles(), []);

  const [objectHint, setObjectHint] = useState("");

  const [backendFillSnapshot, setBackendFillSnapshot] = useState<{
    category: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    setObjectHint(t("form.categoryHintDefault"));
  }, [t, locale]);

  useEffect(() => {
    const prepareModel = async () => {
      try {
        setLoading(true);
        const ok = await initMobilenet();
        setModelLoaded(ok);
        if (!ok) {
          console.error("TensorFlow.js / MobileNet init failed");
        }
      } catch (error) {
        console.error("TensorFlow.js load failed", error);
        setModelLoaded(false);
      } finally {
        setLoading(false);
      }
    };

    prepareModel();

    return () => {
      disposeMobilenet();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    import("react-native-google-places-autocomplete")
      .then((mod) => {
        if (mounted) {
          setGooglePlacesAutocompleteComponent(
            () => mod.GooglePlacesAutocomplete,
          );
        }
      })
      .catch((error) => {
        console.error("Load GooglePlacesAutocomplete failed:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-fetch current location
  useEffect(() => {
    const initializeLocation = async () => {
      await getCurrentLocation();
    };
    initializeLocation();
  }, []);

  useEffect(() => {
    if (!pendingDraft) {
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
    setFeatureVector(d.featureVector);
    setPredictions([]);
    setObjectHint(t("form.categoryHintDefault"));
    setLastFeatureDim(d.featureVector.length);
    setBackendFillSnapshot({
      category: d.category,
      description: d.description,
    });
    consumeDraft();
  }, [pendingDraft, consumeDraft, t]);

  const handleClearBackendFill = () => {
    setCategory("");
    setDescription("");
    setPredictions([]);
    setObjectHint(t("form.categoryHintDefault"));
    setBackendFillSnapshot(null);
  };

  const normalizeClassName = (className: string) => {
    return className.split(",")[0].replace(/_/g, " ").trim();
  };

  const resetFormState = () => {
    setImageUri(null);
    setImageMime("image/jpeg");
    setFeatureVector(null);
    setTitle("");
    setPredictions([]);
    setTime("");
    setPickedOccurredAt(null);
    setShowDatePicker(false);
    setTimeInputError("");
    setLocation("");
    setCategory("");
    setKind("lost");
    setDescription("");
    setSubmitMessage("");
    setSubmitError("");
    setLastFeatureDim(null);
    setPlaceGeometry(null);
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
    address: any,
    name: string,
    latitude: number,
    longitude: number,
  ) => {
    const { road, house_number, neighbourhood, suburb, city, county, country } =
      address;

    const locationParts: string[] = [];
    const listSep = locale === "zh-Hant" ? "，" : ", ";

    if (road && house_number) {
      locationParts.push(
        t("address.roadWithNumber", {
          road: String(road),
          house_number: String(house_number),
        }),
      );
    } else if (road) {
      locationParts.push(t("address.roadNearby", { road: String(road) }));
    } else if (name) {
      locationParts.push(name);
    }

    if (neighbourhood) {
      locationParts.push(String(neighbourhood));
    } else if (suburb) {
      locationParts.push(String(suburb));
    }

    if (city) {
      locationParts.push(String(city));
    } else if (county) {
      locationParts.push(String(county));
    }

    if (locationParts.length === 0) {
      const latDesc =
        latitude > 25.0
          ? t("address.north")
          : latitude > 23.5
            ? t("address.centralLat")
            : t("address.south");
      const lonDesc =
        longitude > 121.0
          ? t("address.east")
          : longitude > 120.5
            ? t("address.west")
            : t("address.centralLon");

      if (country) {
        return t("address.inCountry", {
          country: String(country),
          latDesc,
          lonDesc,
        });
      }
      return t("address.mystery", {
        lat: latitude.toFixed(4),
        lng: longitude.toFixed(4),
      });
    }

    return locationParts.join(listSep);
  };

  const getCategoryDescription = (className: string) => {
    const key = className.toLowerCase();
    const keys = [
      "dog",
      "cat",
      "person",
      "car",
      "truck",
      "boat",
      "bicycle",
      "airplane",
      "banana",
      "pizza",
      "apple",
      "cup",
    ] as const;
    for (const match of keys) {
      if (key.includes(match)) {
        return t(`mlHint.${match}`);
      }
    }

    return t("mlHint.generic", {
      className: normalizeClassName(className),
    });
  };

  const classifyImage = async (uri: string) => {
    if (!modelLoaded) {
      return;
    }

    setLoading(true);
    setPredictions([]);
    setSubmitMessage("");
    setSubmitError("");
    setFeatureVector(null);

    try {
      const { rawPredictions, featureVector: vec } =
        await classifyImageFromUri(uri);
      const formatted: ImageLabelPrediction[] = rawPredictions.map((item) => ({
        className: item.className,
        probability: Math.round(item.probability * 10000) / 100,
      }));

      setLastFeatureDim(vec.length);
      if (vec.length === EMBEDDING_DIM) {
        setFeatureVector(vec);
      } else {
        setFeatureVector(null);
      }

      setPredictions(formatted);

      if (formatted.length > 0) {
        const top = formatted[0];
        const normalized = normalizeClassName(top.className);
        setCategory(normalized);
        setObjectHint(getCategoryDescription(top.className));
      }
    } catch (error) {
      console.error("Classification error", error);
      setObjectHint(t("form.classifyFail"));
      setLastFeatureDim(null);
      setFeatureVector(null);
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
    setImageMime(asset.mimeType ?? "image/jpeg");
    await classifyImage(uri);
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
    setImageMime(asset.mimeType ?? "image/jpeg");
    await classifyImage(uri);
  };

  const handleSubmit = () => {
    setSubmitMessage("");
    setSubmitError("");

    if (!modelLoaded) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.modelNotReady"));
      return;
    }
    if (!imageUri) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needImage"));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needTitle"));
      return;
    }
    if (featureVector?.length !== EMBEDDING_DIM) {
      Alert.alert(t("form.cannotSubmitTitle"), t("form.needEmbedding"));
      return;
    }

    const occurredAt = parseOccurredAtIso(time);
    if (time.trim() && (!occurredAt || timeInputError)) {
      setTimeInputError(validateDateInput(time));
      return;
    }

    const formData = {
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      locationText: location.trim() || undefined,
      occurredAt,
      modelVersion: MODEL_VERSION,
      embedding: featureVector,
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
            kind:
              kind === "lost" ? t("form.kindLost") : t("form.kindFound"),
            id: data.item.id,
            time: time.trim() || t("common.notProvided"),
            location: location.trim() || t("common.notProvided"),
            category: category.trim() || t("common.notProvided"),
          }),
        );
        resetFormState();
        router.replace(formData.kind === "found" ? "/(tabs)/found" : "/(tabs)");
      },
      onError: (e) => {
        const msg =
          e instanceof ApiError
            ? `${e.code}：${e.message}`
            : e instanceof Error
              ? e.message
              : String(e);
        setSubmitError(msg);
      },
    });
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Location permission error:", error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(t("form.permLocationTitle"), t("form.permLocationBody"));
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationResult.coords;

      // Reverse geocode via Nominatim (replaces deprecated Google Geocoding API)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "FindMyApp/1.0",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Nominatim API request failed");
        }

        const data = await response.json();
        console.log(data, "addressResult from Nominatim");

        if (data && data.address) {
          const readableAddress = generateReadableAddressFromNominatim(
            data.address,
            data.name || "",
            latitude,
            longitude,
          );
          setLocation(readableAddress);
        } else {
          setLocation(
            t("address.unknownPin", {
              lat: latitude.toFixed(4),
              lng: longitude.toFixed(4),
            }),
          );
        }
        setPlaceGeometry({
          location: { lat: latitude, lng: longitude },
        });
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        setLocation(
          t("address.coordsPin", {
            lat: latitude.toFixed(4),
            lng: longitude.toFixed(4),
          }),
        );
        setPlaceGeometry({
          location: { lat: latitude, lng: longitude },
        });
      }
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert(t("form.locationFailedTitle"), t("form.locationFailedBody"));
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePlacesSelect = (data: any, details: any) => {
    const selectedAddress =
      typeof data?.description === "string" ? data.description : "";
    setLocation(selectedAddress);

    const geometry = extractPlaceGeometry(details);
    setPlaceGeometry(geometry);

    if (geometry) {
      if (__DEV__) {
        console.log("[Places] geometry", {
          location: geometry.location,
          viewport: geometry.viewport,
          place_id: (details as { place_id?: string })?.place_id,
        });
      }
    } else {
      console.warn(
        "[Places] No geometry returned. Ensure fetchDetails is set, the API key has Place Details enabled, and GooglePlacesDetailsQuery requests geometry fields.",
        details,
      );
    }
  };

  const titleLabel =
    kind === "lost" ? t("form.titleLost") : t("form.titleFound");
  const timeLabel = kind === "lost" ? t("form.timeLost") : t("form.timeFound");
  const locationLabel =
    kind === "lost" ? t("form.locationLost") : t("form.locationFound");

  let headerRight: React.ReactNode = null;
  if (backendFillSnapshot != null) {
    headerRight = (
      <Pressable onPress={handleClearBackendFill} hitSlop={12}>
        <ThemedText type="link">{t("form.clearAiFill")}</ThemedText>
      </Pressable>
    );
  }

  return (
    <PageLayoutWithHeader
      screenTitle={t("form.screenTitle")}
      screenSubtitle={t("form.screenSubtitle")}
      icon="shippingbox.fill"
      headerRight={headerRight}
    >
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
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={styles.calendarModalOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable
              style={[
                styles.calendarModalCard,
                { backgroundColor: c.cardBackground, borderColor: c.borderSubtle },
              ]}
              onPress={() => {}}
            >
              <Calendar
                current={formatDateInputValue(pickedOccurredAt ?? new Date())}
                maxDate={formatDateInputValue(new Date())}
                onDayPress={handleCalendarDayPress}
                markedDates={
                  time && !timeInputError
                    ? {
                        [time]: {
                          selected: true,
                          selectedColor: c.brand,
                        },
                      }
                    : undefined
                }
                theme={{
                  calendarBackground: c.cardBackground,
                  textSectionTitleColor: c.textMuted,
                  dayTextColor: c.textPrimary,
                  monthTextColor: c.textPrimary,
                  arrowColor: c.brand,
                  selectedDayBackgroundColor: c.brand,
                  selectedDayTextColor: c.onBrand,
                  todayTextColor: c.brand,
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <IconSymbol name="mappin.circle.fill" size={18} color={c.textMuted} />
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {locationLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.useCurrentLocationButton,
            {
              backgroundColor: c.brand,
            },
          ]}
          onPress={getCurrentLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={c.onBrand} />
          ) : (
            <Text
              style={[
                styles.useCurrentLocationButtonText,
                { color: c.onBrand },
              ]}
            >
              {t("form.useGps")}
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={[
            styles.autocompleteContainer,
            {
              borderColor: c.borderSubtle,
              backgroundColor: c.cardBackground,
            },
          ]}
        >
          {GooglePlacesAutocompleteComponent ? (
            <GooglePlacesAutocompleteComponent
              placeholder={t("form.placesPlaceholder")}
              onPress={handlePlacesSelect}
              fetchDetails
              debounce={300}
              listViewDisplayed="auto"
              keepResultsAfterBlur
              enablePoweredByContainer={false}
              GooglePlacesDetailsQuery={{
                fields: "geometry,formatted_address,name,place_id",
              }}
              query={{
                key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                language: locale === "zh-Hant" ? "zh-HK" : "en",
                components: "country:hk",
              }}
              onFail={(error: any) => {
                console.error("Google places autocomplete error:", error);
              }}
              textInputProps={{
                placeholderTextColor: c.placeholder,
              }}
              styles={{
                container: {
                  flex: 0,
                  width: "100%",
                },
                textInputContainer: {
                  width: "100%",
                  backgroundColor: c.chipBackground,
                  borderRadius: 999,
                  borderWidth: 0,
                  paddingHorizontal: 4,
                },
                textInput: {
                  height: 48,
                  color: c.textPrimary,
                  fontSize: 16,
                  paddingHorizontal: 16,
                },
                predefinedPlacesDescription: {
                  color: c.brand,
                },
                listView: {
                  position: "absolute",
                  top: 52,
                  left: 0,
                  right: 0,
                  backgroundColor: c.cardBackground,
                  zIndex: 1000,
                  elevation: 10,
                  borderRadius: 12,
                  overflow: "hidden",
                },
                row: {
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomColor: c.borderSubtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                description: {
                  fontSize: 14,
                  color: c.textMuted,
                },
                loader: {
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  height: 20,
                },
              }}
            />
          ) : (
            <ActivityIndicator size="small" color={c.brand} />
          )}
        </View>

        {location ? (
          <View
            style={[styles.locationInfo, { backgroundColor: c.chipBackground }]}
          >
            <ThemedText
              style={[styles.locationInfoText, { color: c.textPrimary }]}
            >
              {t("form.selectedPrefix")}
              {location}
            </ThemedText>
            {placeGeometry ? (
              <ThemedText
                style={[styles.locationGeometryText, { color: c.textMuted }]}
              >
                {t("form.coordsLine", {
                  lat: placeGeometry.location.lat.toFixed(6),
                  lng: placeGeometry.location.lng.toFixed(6),
                })}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: c.textPrimary }]}>
            {t("form.categoryLabel")}
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
            placeholder={t("form.categoryPlaceholder")}
            placeholderTextColor={c.placeholder}
            value={category}
            onChangeText={setCategory}
          />
          <IconSymbol name="chevron.down" size={22} color={c.textMuted} />
        </View>
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
        <View style={styles.fileUploadWrapper}>
          <TouchableOpacity
            style={[
              styles.pickImageButton,
              { backgroundColor: c.brand },
              (!modelLoaded || loading) && styles.pickImageButtonDisabled,
            ]}
            onPress={handleTakePhoto}
            disabled={!modelLoaded || loading}
          >
            <Text style={[styles.pickImageButtonText, { color: c.onBrand }]}>
              {modelLoaded ? t("form.takePhoto") : t("form.modelLoading")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pickImageButtonOutline,
              { borderColor: c.brand },
              (!modelLoaded || loading) && styles.pickImageButtonDisabled,
            ]}
            onPress={handlePickFromLibrary}
            disabled={!modelLoaded || loading}
          >
            <Text
              style={[styles.pickImageButtonOutlineText, { color: c.brand }]}
            >
              {t("form.pickLibrary")}
            </Text>
          </TouchableOpacity>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={c.brand}
              style={styles.pickImageSpinner}
            />
          ) : null}
        </View>
      </View>

      {imageUri ? (
        <View
          style={[
            styles.previewContainer,
            {
              borderColor: c.borderSubtle,
              backgroundColor: c.cardBackground,
            },
          ]}
        >
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.previewImage}
            contentFit="contain"
          />
        </View>
      ) : null}

      {predictions.length > 0 ? (
        <View
          style={[
            styles.predictionPanel,
            {
              backgroundColor: c.cardBackground,
              borderColor: c.borderSubtle,
            },
          ]}
        >
          <ThemedText
            type="subtitle"
            style={[styles.predictionTitle, { color: c.textPrimary }]}
          >
            {t("form.predictionsTitle")}
          </ThemedText>
          {predictions.map((item, index) => (
            <View key={index} style={styles.predictionItem}>
              <ThemedText
                style={[styles.predictionText, { color: c.textPrimary }]}
              >
                {index + 1}. {normalizeClassName(item.className)}
              </ThemedText>
              <ThemedText
                style={[styles.probabilityText, { color: c.textMuted }]}
              >
                {item.probability}%
              </ThemedText>
            </View>
          ))}
          {lastFeatureDim != null ? (
            <ThemedText style={[styles.dbHint, { color: c.textMuted }]}>
              {t("form.embeddingHint", { dim: String(lastFeatureDim) })}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: c.brand },
          createItemMutation.isPending && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={createItemMutation.isPending}
      >
        {createItemMutation.isPending ? (
          <ActivityIndicator color={c.onBrand} />
        ) : (
          <Text style={[styles.submitButtonText, { color: c.onBrand }]}>
            {kind === "lost" ? t("form.submitLost") : t("form.submitFound")}
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
    </PageLayoutWithHeader>
  );
}

function createLostItemFormStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
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
    fileUploadWrapper: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    },
    pickImageButton: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 999,
      alignSelf: "flex-start",
    },
    pickImageButtonOutline: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 999,
      borderWidth: 2,
      backgroundColor: "transparent",
      alignSelf: "flex-start",
    },
    pickImageButtonDisabled: {
      opacity: 0.55,
    },
    pickImageButtonText: {
      fontSize: 15,
      fontWeight: "600",
    },
    pickImageButtonOutlineText: {
      fontSize: 15,
      fontWeight: "600",
    },
    pickImageSpinner: {
      marginLeft: 4,
    },
    previewContainer: {
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 16,
    },
    previewImage: {
      width: "100%",
      maxHeight: 360,
    },
    predictionPanel: {
      padding: 16,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 16,
    },
    predictionTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 8,
    },
    predictionItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    predictionText: {
      fontSize: 15,
    },
    probabilityText: {
      fontSize: 14,
    },
    dbHint: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 18,
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
    locationInfo: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
    },
    locationInfoText: {
      fontSize: 13,
      lineHeight: 18,
    },
    locationGeometryText: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
    },
    autocompleteContainer: {
      marginTop: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 16,
      overflow: "visible",
      zIndex: 50,
      paddingVertical: 4,
    },
    useCurrentLocationButton: {
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    useCurrentLocationButtonText: {
      fontSize: 14,
      fontWeight: "700",
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
