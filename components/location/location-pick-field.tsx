import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { nominatimReverse } from "@/lib/nominatim";
import { buildReadableAddressFromNominatim } from "@/lib/nominatim-readable-address";
import { extractPlaceGeometry } from "@/lib/places-geometry";
import { getCurrentOrLastKnownPositionAsync } from "@/lib/location/current-position";
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
import {
  PlacesAddressAutocomplete,
  type PlacesAddressAutocompleteRef,
} from "@/components/location/places-address-autocomplete";

export type LocationPickChange = Readonly<{
  label: string;
  lat: number;
  lng: number;
}>;

type Props = Readonly<{
  addressLabel: string;
  onLocationChange: (value: LocationPickChange) => void;
  onAddressTextChange?: (text: string) => void;
  onPressPickOnMap: () => void;
  pickOnMapLabel?: string;
  useGpsLabel?: string;
  placesPlaceholder?: string;
}>;

export function LocationPickField({
  addressLabel,
  onLocationChange,
  onAddressTextChange,
  onPressPickOnMap,
  pickOnMapLabel,
  useGpsLabel,
  placesPlaceholder,
}: Props) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createStyles(c), [c]);
  const placesRef = useRef<PlacesAddressAutocompleteRef | null>(null);
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

      const locationResult = await getCurrentOrLastKnownPositionAsync();

      const { latitude, longitude } = locationResult.coords;

      try {
        const data = await nominatimReverse(latitude, longitude, { locale });
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

  const handlePlacesSelect = (selectedAddress: string, details: unknown) => {
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
        <PlacesAddressAutocomplete
          ref={placesRef}
          placeholder={placeholder}
          language={locale === "zh-Hant" ? "zh-HK" : "en"}
          country="hk"
          debounceMs={300}
          onSelect={handlePlacesSelect}
          onTextChange={onAddressTextChange}
          onFail={(error: unknown) => {
            console.error("Google places autocomplete error:", error);
          }}
        />
      </View>
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
  });
}
