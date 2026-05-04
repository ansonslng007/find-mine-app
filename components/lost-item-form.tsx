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
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

/** Place Details 回傳的 geometry（location + 選填 viewport）。 */
interface PlaceGeometry {
  location: { lat: number; lng: number };
  viewport?: unknown;
}

/** 從 `onPress(data, details)` 的 `details`（即 `result`）解析 geometry。 */
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

function parseOccurredAtIso(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function imageMimeToFileName(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "upload.png";
  if (m.includes("webp")) return "upload.webp";
  return "upload.jpg";
}

export function LostItemForm() {
  const createItemMutation = useCreateItem();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [featureVector, setFeatureVector] = useState<number[] | null>(null);
  const [title, setTitle] = useState("");
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<ItemKind>("lost");
  const [description, setDescription] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [lastFeatureDim, setLastFeatureDim] = useState<number | null>(null);
  const [objectHint, setObjectHint] =
    useState("請上傳圖片後，自動填入分類類別。");
  const [locationLoading, setLocationLoading] = useState(false);
  const [placeGeometry, setPlaceGeometry] = useState<PlaceGeometry | null>(
    null,
  );
  const [
    GooglePlacesAutocompleteComponent,
    setGooglePlacesAutocompleteComponent,
  ] = useState<React.ComponentType<any> | null>(null);
  const c = useAppColors();
  const styles = useMemo(() => createLostItemFormStyles(), []);

  useEffect(() => {
    const prepareModel = async () => {
      try {
        setLoading(true);
        const ok = await initMobilenet();
        setModelLoaded(ok);
        if (!ok) {
          console.error("TensorFlow.js / MobileNet 初始化失敗");
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

  // 自動獲取當前位置
  useEffect(() => {
    const initializeLocation = async () => {
      await getCurrentLocation();
    };
    initializeLocation();
  }, []);

  const normalizeClassName = (className: string) => {
    return className.split(",")[0].replace(/_/g, " ").trim();
  };

  const generateReadableAddressFromNominatim = (
    address: any,
    name: string,
    latitude: number,
    longitude: number,
  ) => {
    // Nominatim 返回的地址格式
    const { road, house_number, neighbourhood, suburb, city, county, country } =
      address;

    const locationParts = [];

    // 添加街道信息
    if (road && house_number) {
      locationParts.push(`${road}${house_number}號`);
    } else if (road) {
      locationParts.push(`${road}附近`);
    } else if (name) {
      locationParts.push(name);
    }

    // 添加鄰近地區
    if (neighbourhood) {
      locationParts.push(neighbourhood);
    } else if (suburb) {
      locationParts.push(suburb);
    }

    // 添加城市信息
    if (city) {
      locationParts.push(city);
    } else if (county) {
      locationParts.push(county);
    }

    // 如果沒有詳細地址，嘗試創建有趣的描述
    if (locationParts.length === 0) {
      const latDesc =
        latitude > 25.0 ? "北部" : latitude > 23.5 ? "中部" : "南部";
      const lonDesc =
        longitude > 121.0 ? "東部" : longitude > 120.5 ? "西部" : "中部";

      if (country) {
        return `📍 ${country}境內 (${latDesc}${lonDesc})`;
      } else {
        return `📍 神秘地點 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      }
    }

    // 組合地址並添加表情符號
    const fullAddress = locationParts.join("，");
    return `${fullAddress}`;
  };

  const getCategoryDescription = (className: string) => {
    const key = className.toLowerCase();
    const descriptions: Record<string, string> = {
      dog: "這看起來像一隻狗，適合填入「寵物/動物」類別。",
      cat: "這看起來像一隻貓，建議歸類為「寵物/動物」。",
      person: "這是一名人，請檢查是否為身分證件或人物照片。",
      car: "這是一輛車，建議歸類為「交通工具」。",
      truck: "這是一輛卡車，適合歸入「交通工具」。",
      boat: "這是一艘船，建議歸類為「交通工具」。",
      bicycle: "這是一部腳踏車，適合分類為「交通工具」。",
      airplane: "這是一架飛機，可歸為「交通工具」。",
      banana: "這是一根香蕉，適合歸類為「食品/日用品」。",
      pizza: "這是一份披薩，建議歸類為「食品」。",
      apple: "這是一個蘋果，適合歸類為「食品」。",
      cup: "這是一個杯子，建議分類為「日用品」。",
    };

    for (const [match, descriptionText] of Object.entries(descriptions)) {
      if (key.includes(match)) {
        return descriptionText;
      }
    }

    return `模型辨識為「${normalizeClassName(className)}」，請確認是否填入此類別。`;
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
      setObjectHint("分類失敗，請確認為 JPEG/PNG 等常見格式後再試。");
      setLastFeatureDim(null);
      setFeatureVector(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("權限不足", "需要相簿權限才能選擇圖片。");
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
      Alert.alert("權限不足", "需要相機權限才能拍照。");
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
      Alert.alert("無法送出", "模型尚未載入完成，請稍候。");
      return;
    }
    if (!imageUri) {
      Alert.alert("無法送出", "請先拍照或從相簿選擇物品圖片。");
      return;
    }
    if (!title.trim()) {
      Alert.alert("無法送出", "請填寫「標題 / 物品名稱」。");
      return;
    }
    if (featureVector?.length !== EMBEDDING_DIM) {
      Alert.alert(
        "無法送出",
        "尚未取得有效的圖片嵌入向量，請確認已上傳圖片且辨識完成。",
      );
      return;
    }

    const occurredAt = parseOccurredAtIso(time);

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
    console.log(formData, "formData");
    createItemMutation.mutate(formData, {
      onSuccess: (data) => {
        setSubmitMessage(
          `已同步到伺服器（${kind === "lost" ? "遺失" : "尋獲"}）。項目 id：${data.item.id}（時間 ${time || "未填"}, 地點 ${location || "未填"}, 類別 ${category || "未填"}）`,
        );
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
        Alert.alert("權限不足", "需要位置權限才能獲取當前位置。");
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationResult.coords;

      // 使用 Nominatim 服務進行反向地理編碼（替代已廢棄的 Google Geocoding API）
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
            `📍 未知地點 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          );
        }
        setPlaceGeometry({
          location: { lat: latitude, lng: longitude },
        });
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        setLocation(
          `📍 位置座標 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        );
        setPlaceGeometry({
          location: { lat: latitude, lng: longitude },
        });
      }
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert("獲取位置失敗", "請檢查位置權限或網路連接。");
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
        "[Places] 未取得 geometry，請確認已設 fetchDetails、API Key 已啟用 Place Details，且 GooglePlacesDetailsQuery 含 geometry 欄位。",
        details,
      );
    }
  };

  const titleLabel = kind === "lost" ? "遺失了什麼？" : "拾獲了什麼？";
  const timeLabel = kind === "lost" ? "遺失時間" : "發現時間";
  const locationLabel = kind === "lost" ? "遺失地點" : "拾獲地點";

  return (
    <PageLayoutWithHeader
      screenTitle="失物建立表單"
      screenSubtitle="一起找回遺失物"
      icon="shippingbox.fill"
    >
      <View style={[styles.segmentWrap, { backgroundColor: c.chipBackground }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            kind === "lost" && styles.segmentBtnLostActive,
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
            我遺失了物品
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            kind === "found" && { backgroundColor: c.brand },
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
            我撿到物品
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
          placeholder="例如：黑色後背包"
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
            placeholder="例如：2026-04-30 14:30"
            placeholderTextColor={c.placeholder}
            value={time}
            onChangeText={setTime}
          />
          <IconSymbol name="calendar" size={20} color={c.textMuted} />
        </View>
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
              使用目前位置（GPS）
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
              placeholder="搜尋香港地址或地點"
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
                language: "zh-HK",
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
              已選擇：{location}
            </ThemedText>
            {placeGeometry ? (
              <ThemedText
                style={[styles.locationGeometryText, { color: c.textMuted }]}
              >
                座標：緯度 {placeGeometry.location.lat.toFixed(6)}、經度{" "}
                {placeGeometry.location.lng.toFixed(6)}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: c.textPrimary }]}>類別</Text>
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
            placeholder="上傳圖片後會自動填入，亦可手動修改"
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
          補充說明
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
          placeholder="例如：黑色背包內有筆電、護照。"
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
            物品照片
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
              {modelLoaded ? "立即拍照" : "模型載入中…"}
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
              從相簿選擇
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
            模型辨識結果
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
              特徵向量維度：{lastFeatureDim}（MobileNet
              嵌入，建立失物時會一併上傳至伺服器）
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
            {kind === "lost" ? "送出遺失通報" : "送出尋獲通報"}
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
    segmentBtnLostActive: {
      backgroundColor: "#EF4444",
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
  });
}
