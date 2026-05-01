import { useColorScheme } from "@/hooks/use-color-scheme";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import { Image as ExpoImage } from "expo-image";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface PredictionResult {
  className: string;
  probability: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export function LostItemForm() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelSupported, setModelSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [objectHint, setObjectHint] =
    useState("請上傳圖片後，自動填入分類類別。");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const modelRef = useRef<mobilenet.MobileNet | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    const prepareModel = async () => {
      if (Platform.OS !== "web") {
        setModelSupported(false);
        return;
      }

      setModelSupported(true);
      try {
        setLoading(true);
        await tf.ready();
        const model = await mobilenet.load();
        modelRef.current = model;
        setModelLoaded(true);
      } catch (error) {
        console.error("TensorFlow.js load failed", error);
      } finally {
        setLoading(false);
      }
    };

    prepareModel();

    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  const normalizeClassName = (className: string) => {
    return className.split(",")[0].replace(/_/g, " ").trim();
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
    if (!modelRef.current || !modelSupported) {
      return;
    }

    setLoading(true);
    setPredictions([]);
    setSubmitMessage("");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const results = await modelRef.current!.classify(img);
        const formatted = results.map((item) => ({
          className: item.className,
          probability: Math.round(item.probability * 10000) / 100,
        }));

        setPredictions(formatted);

        if (formatted.length > 0) {
          const top = formatted[0];
          const normalized = normalizeClassName(top.className);
          setCategory(normalized);
          setObjectHint(getCategoryDescription(top.className));
        }
      } catch (error) {
        console.error("Classification error", error);
        setObjectHint("分類失敗，請嘗試重新上傳圖片。");
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setLoading(false);
      setObjectHint("圖片載入失敗，請確認檔案格式。");
    };

    img.src = uri;
  };

  const handleImageUpload = (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        setImageUri(result);
        classifyImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setSubmitMessage(
      `已建立失物資料：時間 ${time || "未填"}, 地點 ${location || "未填"}, 類別 ${category || "未填"}。`,
    );
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
      setLocationData({ latitude, longitude });

      // 嘗試反向地理編碼獲取地址
      try {
        const addressResult = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addressResult.length > 0) {
          const address = addressResult[0];
          const addressString =
            `${address.city || ""} ${address.region || ""} ${address.street || ""} ${address.streetNumber || ""}`.trim();
          setLocation(
            addressString ||
              `緯度: ${latitude.toFixed(6)}, 經度: ${longitude.toFixed(6)}`,
          );
        } else {
          setLocation(
            `緯度: ${latitude.toFixed(6)}, 經度: ${longitude.toFixed(6)}`,
          );
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        setLocation(
          `緯度: ${latitude.toFixed(6)}, 經度: ${longitude.toFixed(6)}`,
        );
      }

      setShowLocationOptions(false);
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert("獲取位置失敗", "請檢查位置權限或網路連接。");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationInput = (text: string) => {
    setLocation(text);
    setLocationData(null); // 清除 GPS 數據，因為用戶手動輸入
  };

  const openLocationOptions = () => {
    setShowLocationOptions(!showLocationOptions);
  };

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#05121F" : "#F7FBFF" },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.header}>
          失物建立表單
        </ThemedText>
        <ThemedText style={styles.subheader}>
          請填寫遺失時間、地點，並上傳物品圖片以便自動辨識類別。
        </ThemedText>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>遺失時間</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="例如：2026-04-30 14:30"
            placeholderTextColor="rgba(88, 100, 122, 0.6)"
            value={time}
            onChangeText={setTime}
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.locationHeader}>
            <ThemedText style={styles.label}>遺失地點</ThemedText>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocationOptions}
            >
              <Text style={styles.locationButtonText}>
                {showLocationOptions ? "隱藏選項" : "選擇位置"}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="例如：捷運站出口、百貨公司、一號停車場"
            placeholderTextColor="rgba(88, 100, 122, 0.6)"
            value={location}
            onChangeText={handleLocationInput}
          />

          {showLocationOptions && (
            <View style={styles.locationOptions}>
              <TouchableOpacity
                style={styles.locationOption}
                onPress={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.locationOptionText}>
                    📍 使用當前 GPS 位置
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.locationDivider}>
                <Text style={styles.locationDividerText}>或</Text>
              </View>

              <ThemedText style={styles.locationManualText}>
                手動輸入地址或地點名稱
              </ThemedText>
            </View>
          )}

          {locationData && (
            <View style={styles.locationInfo}>
              <ThemedText style={styles.locationInfoText}>
                📌 已選擇位置：緯度 {locationData.latitude.toFixed(6)}, 經度{" "}
                {locationData.longitude.toFixed(6)}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>物品類別</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="系統將在上傳圖片後自動填入"
            placeholderTextColor="rgba(88, 100, 122, 0.6)"
            value={category}
            onChangeText={setCategory}
          />
          <ThemedText style={styles.hint}>{objectHint}</ThemedText>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>補充說明</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例如：黑色背包內有筆電、護照。"
            placeholderTextColor="rgba(88, 100, 122, 0.6)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.uploadSection}>
          <ThemedText style={styles.label}>上傳物品圖片</ThemedText>
          {Platform.OS === "web" ? (
            <View style={styles.fileUploadWrapper}>
              <label style={styles.fileUploadLabel}>
                <Text style={styles.fileUploadText}>
                  {modelLoaded ? "點此選擇圖片" : "模型載入中，請稍候..."}
                </Text>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={!modelLoaded}
                  style={styles.fileUploadInput}
                />
              </label>
              {loading && <ActivityIndicator size="small" color="#007AFF" />}
            </View>
          ) : (
            <ThemedText style={styles.warningText}>
              僅 Web 環境支援 TensorFlow.js 圖片上傳辨識。
            </ThemedText>
          )}
        </View>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <ExpoImage
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="contain"
            />
          </View>
        ) : null}

        {predictions.length > 0 ? (
          <View style={styles.predictionPanel}>
            <ThemedText type="subtitle" style={styles.predictionTitle}>
              模型辨識結果
            </ThemedText>
            {predictions.map((item, index) => (
              <View key={index} style={styles.predictionItem}>
                <ThemedText style={styles.predictionText}>
                  {index + 1}. {normalizeClassName(item.className)}
                </ThemedText>
                <ThemedText style={styles.probabilityText}>
                  {item.probability}%
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>建立失物資料</Text>
        </TouchableOpacity>

        {submitMessage ? (
          <ThemedText style={styles.submitMessage}>{submitMessage}</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subheader: {
    fontSize: 15,
    lineHeight: 24,
    color: "#3C4A63",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F3349",
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: "#5A6B8A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6DFEA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  uploadSection: {
    marginBottom: 14,
  },
  fileUploadWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileUploadSpacer: {
    width: 12,
  },
  fileUploadLabel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignSelf: "flex-start",
  },
  fileUploadText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  fileUploadInput: {
    display: "none",
  },
  warningText: {
    fontSize: 13,
    color: "#8B95A3",
  },
  previewContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4E9F2",
  },
  previewImage: {
    width: "100%",
    maxHeight: 360,
  },
  predictionPanel: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9F2",
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
  },
  predictionText: {
    fontSize: 15,
    color: "#152845",
  },
  probabilityText: {
    fontSize: 14,
    color: "#4C5A74",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  submitMessage: {
    marginTop: 12,
    fontSize: 14,
    color: "#1B4F72",
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
  },
  locationButtonText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "600",
  },
  locationOptions: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  locationOptionText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  locationDivider: {
    alignItems: "center",
    marginVertical: 12,
  },
  locationDividerText: {
    fontSize: 12,
    color: "#6C757D",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
  },
  locationManualText: {
    fontSize: 13,
    color: "#495057",
    textAlign: "center",
  },
  locationInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
  },
  locationInfoText: {
    fontSize: 12,
    color: "#2E7D32",
  },
});
