import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { nominatimReverse } from "@/lib/nominatim";
import { buildReadableAddressFromNominatim } from "@/lib/nominatim-readable-address";
import { extractPlaceGeometry } from "@/lib/places-geometry";
import { useI18n } from "@/providers/i18n-provider";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

export type LocationPickChange = Readonly<{
  label: string;
  lat: number;
  lng: number;
}>;

type Props = Readonly<{
  addressLabel: string;
  onLocationChange: (value: LocationPickChange) => void;
  onPressPickOnMap: () => void;
  pickOnMapLabel?: string;
  useGpsLabel?: string;
  placesPlaceholder?: string;
  showSelectedInfo?: boolean;
  selectedPrefix?: string;
  coordsLine?: (lat: number, lng: number) => string;
  lat?: number;
  lng?: number;
}>;

export function LocationPickField({
  addressLabel,
  onLocationChange,
  onPressPickOnMap,
  pickOnMapLabel,
  useGpsLabel,
  placesPlaceholder,
  showSelectedInfo = false,
  selectedPrefix,
  coordsLine,
  lat,
  lng,
}: Props) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createStyles(c), [c]);
  const placesRef = useRef<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const pickMapText = pickOnMapLabel ?? t("form.pickOnMap");
  const gpsText = useGpsLabel ?? t("form.useGps");
  const placeholder = placesPlaceholder ?? t("form.placesPlaceholder");

  useEffect(() => {
    placesRef.current?.setAddressText(addressLabel);
  }, [addressLabel]);

  const applyLocation = (label: string, latitude: number, longitude: number) => {
    placesRef.current?.setAddressText(label);
    onLocationChange({ label, lat: latitude, lng: longitude });
  };

  const getCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("form.permLocationTitle"), t("form.permLocationBody"));
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationResult.coords;

      try {
        const data = await nominatimReverse(latitude, longitude);
        if (data?.address) {
          const readableAddress = buildReadableAddressFromNominatim(
            data.address,
            typeof data.name === "string" ? data.name : "",
            latitude,
            longitude,
            { locale, translate: t },
          );
          applyLocation(readableAddress, latitude, longitude);
        } else {
          applyLocation(
            t("address.unknownPin", {
              lat: latitude.toFixed(4),
              lng: longitude.toFixed(4),
            }),
            latitude,
            longitude,
          );
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        applyLocation(
          t("address.coordsPin", {
            lat: latitude.toFixed(4),
            lng: longitude.toFixed(4),
          }),
          latitude,
          longitude,
        );
      }
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert(t("form.locationFailedTitle"), t("form.locationFailedBody"));
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePlacesSelect = (data: { description?: string }, details: unknown) => {
    const selectedAddress =
      typeof data?.description === "string" ? data.description : "";
    const geometry = extractPlaceGeometry(details);
    if (geometry) {
      applyLocation(
        selectedAddress,
        geometry.location.lat,
        geometry.location.lng,
      );
      return;
    }
    placesRef.current?.setAddressText(selectedAddress);
    if (__DEV__) {
      console.warn(
        "[Places] No geometry returned. Ensure fetchDetails is set and GooglePlacesDetailsQuery requests geometry fields.",
        details,
      );
    }
  };

  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <View style={styles.root}>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.chipBackground }]}
          onPress={onPressPickOnMap}
          activeOpacity={0.85}
        >
          <IconSymbol name="map" size={18} color={c.textPrimary} />
          <Text style={[styles.btnText, { color: c.textPrimary }]}>
            {pickMapText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: c.chipBackground,
              opacity: gpsLoading ? 0.4 : 1,
            },
          ]}
          onPress={getCurrentLocation}
          disabled={gpsLoading}
          activeOpacity={0.85}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={c.textPrimary} />
          ) : (
            <IconSymbol name="location.fill" size={18} color={c.textPrimary} />
          )}
          <Text style={[styles.btnText, { color: c.textPrimary }]}>
            {gpsText}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.autocompleteContainer}>
        <GooglePlacesAutocomplete
          ref={placesRef}
          placeholder={placeholder}
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
          onFail={(error: unknown) => {
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
              borderColor: c.borderSubtle,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: 999,
              height: undefined,
            },
            textInput: {
              color: c.textPrimary,
              fontSize: 15,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: "transparent",
              margin: 0,
              height: undefined,
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
      </View>

      {showSelectedInfo && addressLabel ? (
        <View
          style={[styles.locationInfo, { backgroundColor: c.chipBackground }]}
        >
          <ThemedText style={[styles.locationInfoText, { color: c.textPrimary }]}>
            {selectedPrefix}
            {addressLabel}
          </ThemedText>
          {hasCoords && coordsLine ? (
            <ThemedText
              style={[styles.locationGeometryText, { color: c.textMuted }]}
            >
              {coordsLine(lat as number, lng as number)}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    root: {
      gap: 10,
    },
    buttonsRow: {
      flexDirection: "row",
      gap: 10,
    },
    btn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    btnText: {
      fontSize: 14,
      fontWeight: "700",
    },
    autocompleteContainer: {
      zIndex: 50,
      overflow: "visible",
    },
    locationInfo: {
      marginTop: 4,
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
  });
}
