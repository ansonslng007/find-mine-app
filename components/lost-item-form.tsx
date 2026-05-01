import { useColorScheme } from "@/hooks/use-color-scheme";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import { Image as ExpoImage } from "expo-image";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

interface WebPlaceSuggestion {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
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
  const [searchResults, setSearchResults] = useState<WebPlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [
    GooglePlacesAutocompleteComponent,
    setGooglePlacesAutocompleteComponent,
  ] = useState<React.ComponentType<any> | null>(null);
  const modelRef = useRef<mobilenet.MobileNet | null>(null);
  const webSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
      if (modelRef.current && "dispose" in modelRef.current) {
        (modelRef.current as any).dispose();
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "web") {
      return;
    }

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

    return () => {
      if (webSearchDebounceRef.current) {
        clearTimeout(webSearchDebounceRef.current);
      }
    };
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
    const {
      road,
      house_number,
      neighbourhood,
      suburb,
      city,
      county,
      state,
      country,
      postcode,
    } = address;

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

  const generateReadableAddress = (
    address: any,
    latitude: number,
    longitude: number,
  ) => {
    const { city, region, street, streetNumber, district, subregion, country } =
      address;

    // 創建有趣的地點描述
    const locationParts = [];

    // 添加街道信息
    if (street && streetNumber) {
      locationParts.push(`${street}${streetNumber}號`);
    } else if (street) {
      locationParts.push(`${street}附近`);
    }

    // 添加地區信息
    if (district) {
      locationParts.push(district);
    }

    // 添加城市/地區信息
    if (city) {
      locationParts.push(city);
    } else if (region) {
      locationParts.push(region);
    }

    // 如果沒有詳細地址，嘗試創建有趣的描述
    if (locationParts.length === 0) {
      // 根據經緯度判斷大概位置
      const latDesc =
        latitude > 25.0 ? "北部" : latitude > 23.5 ? "中部" : "南部";
      const lonDesc =
        longitude > 121.0 ? "東部" : longitude > 120.5 ? "西部" : "中部";

      if (subregion) {
        return `📍 ${subregion}地區 (${latDesc}${lonDesc})`;
      } else if (country) {
        return `📍 ${country}境內 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      } else {
        return `📍 神秘地點 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      }
    }

    // 組合地址並添加表情符號
    const fullAddress = locationParts.join("，");
    const emojis = ["🏠", "🏢", "🏪", "🏬", "🏭", "🏛️", "🏘️", "🏙️", "🌆", "🌃"];

    // 隨機選擇一個表情符號
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    return `${randomEmoji} ${fullAddress}`;
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
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        setLocation(
          `📍 位置座標 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
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
    if (Platform.OS !== "web") {
      return;
    }

    if (webSearchDebounceRef.current) {
      clearTimeout(webSearchDebounceRef.current);
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    webSearchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(trimmedText)}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "FindMyApp/1.0",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Autocomplete request failed");
        }

        const data = await response.json();
        const suggestions: WebPlaceSuggestion[] = Array.isArray(data)
          ? data.map((item: any, index: number) => ({
              id: `${item.place_id ?? index}`,
              description: item.display_name ?? "未知地點",
              latitude: Number(item.lat),
              longitude: Number(item.lon),
            }))
          : [];

        setSearchResults(suggestions);
      } catch (error) {
        console.error("Web autocomplete error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleWebSuggestionSelect = (item: WebPlaceSuggestion) => {
    setLocation(item.description);
    setLocationData({
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handlePlacesSelect = (data: any, details: any) => {
    // 從Google Places Autocomplete獲取選擇的地址
    const selectedAddress = data.description;
    const lat = details?.geometry?.location?.lat;
    const lng = details?.geometry?.location?.lng;

    setLocation(selectedAddress);

    if (lat && lng) {
      setLocationData({ latitude: lat, longitude: lng });
    }

    console.log("Selected place:", {
      address: selectedAddress,
      latitude: lat,
      longitude: lng,
    });
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
          <ThemedText style={styles.label}>遺失地點</ThemedText>

          <TouchableOpacity
            style={styles.useCurrentLocationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.useCurrentLocationButtonText}>
                使用當前位置（GPS）
              </Text>
            )}
          </TouchableOpacity>

          {/* Web 環境下避免 GooglePlacesAutocomplete 初始化錯誤 */}
          {Platform.OS === "web" ? (
            <View style={styles.webSearchContainer}>
              <TextInput
                style={styles.input}
                placeholder="輸入地址或地點名稱"
                placeholderTextColor="rgba(88, 100, 122, 0.6)"
                value={location}
                onChangeText={handleLocationInput}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
              />
              {isSearching && (
                <View style={styles.webSearchLoading}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              )}
              {showSearchResults && searchResults.length > 0 && (
                <View style={styles.webSearchResults}>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.webSearchResultItem}
                        onPress={() => handleWebSuggestionSelect(item)}
                      >
                        <Text style={styles.webSearchResultText}>
                          {item.description}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.autocompleteContainer}>
              {GooglePlacesAutocompleteComponent ? (
                <GooglePlacesAutocompleteComponent
                  placeholder="搜尋地址或地點名稱"
                  onPress={handlePlacesSelect}
                  fetchDetails
                  debounce={300}
                  listViewDisplayed="auto"
                  keepResultsAfterBlur
                  enablePoweredByContainer={false}
                  query={{
                    key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, // 需要替換為您的API Key
                    language: "zh-TW",
                  }}
                  onFail={(error: any) => {
                    console.error("Google places autocomplete error:", error);
                  }}
                  textInputProps={{
                    placeholderTextColor: "rgba(88, 100, 122, 0.6)",
                  }}
                  styles={{
                    container: {
                      flex: 0,
                      width: "100%",
                    },
                    textInputContainer: {
                      width: "100%",
                      borderBottomColor: "#c8c7cc",
                      borderBottomWidth: 1,
                    },
                    textInput: {
                      height: 44,
                      color: "#5d5d5d",
                      fontSize: 16,
                      padding: 10,
                    },
                    predefinedPlacesDescription: {
                      color: "#1faadb",
                    },
                    listView: {
                      position: "absolute",
                      top: 54,
                      left: 0,
                      right: 0,
                      backgroundColor: "#fff",
                      zIndex: 1000,
                      elevation: 10,
                    },
                    row: {
                      paddingHorizontal: 10,
                      paddingVertical: 12,
                      borderBottomColor: "#e5e5e5",
                      borderBottomWidth: 1,
                    },
                    description: {
                      fontSize: 14,
                      color: "#666",
                    },
                    loader: {
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      height: 20,
                    },
                  }}
                />
              ) : (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>
          )}

          {/* 當前位置信息 */}
          {location && (
            <View style={styles.locationInfo}>
              <ThemedText style={styles.locationInfoText}>
                已選擇：{location}
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
  autocompleteContainer: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    borderRadius: 8,
    overflow: "visible",
    zIndex: 50,
  },
  webSearchContainer: {
    marginTop: 12,
  },
  webSearchLoading: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  webSearchResults: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D6DFEA",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    maxHeight: 220,
    overflow: "hidden",
  },
  webSearchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  webSearchResultText: {
    fontSize: 13,
    color: "#334155",
  },
  useCurrentLocationButton: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  useCurrentLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  refreshLocationButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  refreshLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});
