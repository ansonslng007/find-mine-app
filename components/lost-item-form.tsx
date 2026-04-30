import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PredictionResult {
  className: string;
  probability: number;
}

export function LostItemForm() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelSupported, setModelSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [objectHint, setObjectHint] = useState('請上傳圖片後，自動填入分類類別。');
  const modelRef = useRef<mobilenet.MobileNet | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const prepareModel = async () => {
      if (Platform.OS !== 'web') {
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
        console.error('TensorFlow.js load failed', error);
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
    return className
      .split(',')[0]
      .replace(/_/g, ' ')
      .trim();
  };

  const getCategoryDescription = (className: string) => {
    const key = className.toLowerCase();
    const descriptions: Record<string, string> = {
      dog: '這看起來像一隻狗，適合填入「寵物/動物」類別。',
      cat: '這看起來像一隻貓，建議歸類為「寵物/動物」。',
      person: '這是一名人，請檢查是否為身分證件或人物照片。',
      car: '這是一輛車，建議歸類為「交通工具」。',
      truck: '這是一輛卡車，適合歸入「交通工具」。',
      boat: '這是一艘船，建議歸類為「交通工具」。',
      bicycle: '這是一部腳踏車，適合分類為「交通工具」。',
      airplane: '這是一架飛機，可歸為「交通工具」。',
      banana: '這是一根香蕉，適合歸類為「食品/日用品」。',
      pizza: '這是一份披薩，建議歸類為「食品」。',
      apple: '這是一個蘋果，適合歸類為「食品」。',
      cup: '這是一個杯子，建議分類為「日用品」。',
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
    setSubmitMessage('');

    const img = new Image();
    img.crossOrigin = 'anonymous';
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
        console.error('Classification error', error);
        setObjectHint('分類失敗，請嘗試重新上傳圖片。');
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setLoading(false);
      setObjectHint('圖片載入失敗，請確認檔案格式。');
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
      if (typeof result === 'string') {
        setImageUri(result);
        classifyImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setSubmitMessage(`已建立失物資料：時間 ${time || '未填'}, 地點 ${location || '未填'}, 類別 ${category || '未填'}。`);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#05121F' : '#F7FBFF' }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.header}>失物建立表單</ThemedText>
        <ThemedText style={styles.subheader}>請填寫遺失時間、地點，並上傳物品圖片以便自動辨識類別。</ThemedText>

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
          <TextInput
            style={styles.input}
            placeholder="例如：捷運站出口、百貨公司、一號停車場"
            placeholderTextColor="rgba(88, 100, 122, 0.6)"
            value={location}
            onChangeText={setLocation}
          />
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
          {Platform.OS === 'web' ? (
            <View style={styles.fileUploadWrapper}>
              <label style={styles.fileUploadLabel}>
                <Text style={styles.fileUploadText}>{modelLoaded ? '點此選擇圖片' : '模型載入中，請稍候...'}</Text>
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
            <ThemedText style={styles.warningText}>僅 Web 環境支援 TensorFlow.js 圖片上傳辨識。</ThemedText>
          )}
        </View>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <ExpoImage source={{ uri: imageUri }} style={styles.previewImage} contentFit="contain" />
          </View>
        ) : null}

        {predictions.length > 0 ? (
          <View style={styles.predictionPanel}>
            <ThemedText type="subtitle" style={styles.predictionTitle}>模型辨識結果</ThemedText>
            {predictions.map((item, index) => (
              <View key={index} style={styles.predictionItem}>
                <ThemedText style={styles.predictionText}>
                  {index + 1}. {normalizeClassName(item.className)}
                </ThemedText>
                <ThemedText style={styles.probabilityText}>{item.probability}%</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>建立失物資料</Text>
        </TouchableOpacity>

        {submitMessage ? <ThemedText style={styles.submitMessage}>{submitMessage}</ThemedText> : null}
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
    fontWeight: '700',
    marginBottom: 4,
  },
  subheader: {
    fontSize: 15,
    lineHeight: 24,
    color: '#3C4A63',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F3349',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: '#5A6B8A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D6DFEA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadSection: {
    marginBottom: 14,
  },
  fileUploadWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileUploadSpacer: {
    width: 12,
  },
  fileUploadLabel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
    alignSelf: 'flex-start',
  },
  fileUploadText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fileUploadInput: {
    display: 'none',
  },
  warningText: {
    fontSize: 13,
    color: '#8B95A3',
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  previewImage: {
    width: '100%',
    maxHeight: 360,
  },
  predictionPanel: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionText: {
    fontSize: 15,
    color: '#152845',
  },
  probabilityText: {
    fontSize: 14,
    color: '#4C5A74',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#1B4F72',
  },
});
