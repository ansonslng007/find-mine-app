import {
  fetchPlaceAutocompletePredictions,
  fetchPlaceDetails,
} from "@/lib/google-places";
import { useAppColors } from "@/hooks/use-app-colors";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export type PlacesAddressAutocompleteRef = Readonly<{
  setAddressText: (text: string) => void;
}>;

type Prediction = Readonly<{
  description: string;
  place_id: string;
}>;

type Props = Readonly<{
  placeholder: string;
  language: string;
  country?: string;
  debounceMs?: number;
  onSelect: (description: string, details: unknown) => void;
  onFail?: (error: unknown) => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  listStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}>;

export const PlacesAddressAutocomplete = forwardRef<
  PlacesAddressAutocompleteRef,
  Props
>(function PlacesAddressAutocomplete(
  {
    placeholder,
    language,
    country = "hk",
    debounceMs = 300,
    onSelect,
    onFail,
    containerStyle,
    inputContainerStyle,
    inputStyle,
    listStyle,
    rowStyle,
    descriptionStyle,
  },
  ref,
) {
  const c = useAppColors();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [text, setText] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  useImperativeHandle(ref, () => ({
    setAddressText: (value: string) => {
      setText(value);
      setPredictions([]);
    },
  }));

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const runAutocomplete = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      if (!query.trim()) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const rows = await fetchPlaceAutocompletePredictions(query, {
          apiKey,
          language,
          country,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setPredictions(rows);
        }
      } catch (error) {
        if (!ac.signal.aborted) {
          setPredictions([]);
          onFail?.(error);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [apiKey, country, language, onFail],
  );

  const scheduleAutocomplete = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (!query.trim()) {
        setPredictions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void runAutocomplete(query);
      }, debounceMs);
    },
    [debounceMs, runAutocomplete],
  );

  const handleChangeText = (value: string) => {
    setText(value);
    scheduleAutocomplete(value);
  };

  const handleSelectPrediction = async (item: Prediction) => {
    setText(item.description);
    setPredictions([]);
    inputRef.current?.blur();

    try {
      const details = await fetchPlaceDetails(item.place_id, {
        apiKey,
        language,
        fields: "geometry,formatted_address,name,place_id",
      });
      onSelect(item.description, details);
    } catch (error) {
      onFail?.(error);
      onSelect(item.description, null);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          width: "100%",
        },
        inputWrap: {
          width: "100%",
          backgroundColor: c.chipBackground,
          borderColor: c.borderSubtle,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          paddingRight: 12,
        },
        input: {
          flex: 1,
          color: c.textPrimary,
          fontSize: 15,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        loader: {
          marginLeft: 4,
        },
        list: {
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
      }),
    [c],
  );

  const showList = predictions.length > 0;

  return (
    <View style={[styles.root, containerStyle]}>
      <View style={[styles.inputWrap, inputContainerStyle]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          style={[styles.input, inputStyle]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color={c.textMuted}
            style={styles.loader}
          />
        ) : null}
      </View>

      {showList ? (
        <View style={[styles.list, listStyle]}>
          {predictions.map((item, index) => (
            <Pressable
              key={item.place_id}
              style={[
                styles.row,
                rowStyle,
                index === predictions.length - 1
                  ? { borderBottomWidth: 0 }
                  : null,
              ]}
              onPress={() => {
                void handleSelectPrediction(item);
              }}
            >
              <Text style={[styles.description, descriptionStyle]} numberOfLines={2}>
                {item.description}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});
