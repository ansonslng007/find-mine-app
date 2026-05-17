import { ThemedText } from "@/components/themed-text";
import { nominatimReverse } from "@/lib/nominatim";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HK_REGION: Region = {
  latitude: 22.3193,
  longitude: 114.1694,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

/** Approximate distance in meters; enough to ignore float and animation drift. */
const MOVE_UNLOCK_METERS = 28;

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compact dark-ish style for Google Maps (center pin UI). */
const MAP_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1626" }],
  },
];

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    lat: number;
    lng: number;
    addressLabel: string;
  }) => void;
  /** When set, map opens centered here; otherwise Hong Kong + optional GPS. */
  initialCenter?: { lat: number; lng: number } | null;
  formatAddressFromNominatim: (
    address: unknown,
    name: string,
    lat: number,
    lng: number,
  ) => string;
  title: string;
  confirmLabel: string;
  addressLoadingLabel: string;
  reverseFailLabel: string;
  dragHint: string;
  /** Shown under the large pin before the user moves the map. */
  pinHint: string;
  permissionDeniedTitle: string;
  permissionDeniedBody: string;
  locationFailedTitle: string;
  locationFailedBody: string;
}>;

export function MapPickLocationModal({
  visible,
  onClose,
  onConfirm,
  initialCenter,
  formatAddressFromNominatim,
  title,
  confirmLabel,
  addressLoadingLabel,
  reverseFailLabel,
  dragHint,
  pinHint,
  permissionDeniedTitle,
  permissionDeniedBody,
  locationFailedTitle,
  locationFailedBody,
}: Props) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openingBaselineRef = useRef<{ lat: number; lng: number } | null>(null);
  const addressUnlockedRef = useRef(false);

  const [centerLat, setCenterLat] = useState(HK_REGION.latitude);
  const [centerLng, setCenterLng] = useState(HK_REGION.longitude);
  const [addressLabel, setAddressLabel] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  /** User dragged the map (or used current location): show address and live reverse geocoding. */
  const [showAddress, setShowAddress] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);

  const pinAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(mapMoving ? -16 : 0, {
            damping: 12,
            stiffness: 100,
            mass: 0.6,
          }),
        },
      ],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(mapMoving ? 0.35 : 0, { duration: 150 }),
      transform: [
        {
          scale: withTiming(mapMoving ? 1 : 0.4, { duration: 150 }),
        },
      ],
    };
  });

  const runReverse = useCallback(
    async (lat: number, lng: number) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setReverseLoading(true);
      try {
        const data = (await nominatimReverse(lat, lng, ac.signal)) as {
          address?: unknown;
          name?: string;
        };
        if (data?.address) {
          const line = formatAddressFromNominatim(
            data.address,
            typeof data.name === "string" ? data.name : "",
            lat,
            lng,
          );
          setAddressLabel(line);
        } else {
          setAddressLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        if (!ac.signal.aborted) {
          setAddressLabel(reverseFailLabel);
        }
      } finally {
        if (!ac.signal.aborted) {
          setReverseLoading(false);
        }
      }
    },
    [formatAddressFromNominatim, reverseFailLabel],
  );

  const scheduleReverse = useCallback(
    (lat: number, lng: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setReverseLoading(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void runReverse(lat, lng);
      }, 520);
    },
    [runReverse],
  );

  const cancelPendingReverse = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    setReverseLoading(false);
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    if (!addressUnlockedRef.current) {
      return;
    }
    setMapMoving(true);
    setCenterLat(region.latitude);
    setCenterLng(region.longitude);
    cancelPendingReverse();
  }, [cancelPendingReverse]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    openingBaselineRef.current = null;
    addressUnlockedRef.current = false;
    setShowAddress(false);
    setMapMoving(false);
    setAddressLabel("");
    abortRef.current?.abort();
    setReverseLoading(false);

    const lat = initialCenter?.lat ?? HK_REGION.latitude;
    const lng = initialCenter?.lng ?? HK_REGION.longitude;
    setCenterLat(lat);
    setCenterLng(lng);
    const r: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: HK_REGION.latitudeDelta,
      longitudeDelta: HK_REGION.longitudeDelta,
    };
    requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(r, 1);
    });
  }, [visible, initialCenter?.lat, initialCenter?.lng]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      setMapMoving(false);
      setCenterLat(region.latitude);
      setCenterLng(region.longitude);

      if (!addressUnlockedRef.current) {
        if (openingBaselineRef.current == null) {
          openingBaselineRef.current = {
            lat: region.latitude,
            lng: region.longitude,
          };
          return;
        }
        const moved =
          distanceMeters(openingBaselineRef.current, {
            lat: region.latitude,
            lng: region.longitude,
          }) >= MOVE_UNLOCK_METERS;
        if (moved) {
          addressUnlockedRef.current = true;
          setShowAddress(true);
          scheduleReverse(region.latitude, region.longitude);
        }
        return;
      }

      scheduleReverse(region.latitude, region.longitude);
    },
    [scheduleReverse],
  );

  const handleMyLocation = useCallback(async () => {
    setLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(permissionDeniedTitle, permissionDeniedBody);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const r: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
      mapRef.current?.animateToRegion(r, 450);
      openingBaselineRef.current = { lat: latitude, lng: longitude };
      setCenterLat(latitude);
      setCenterLng(longitude);
      addressUnlockedRef.current = true;
      setShowAddress(true);
      setMapMoving(false);
      scheduleReverse(latitude, longitude);
    } catch {
      Alert.alert(locationFailedTitle, locationFailedBody);
    } finally {
      setLocatingMe(false);
    }
  }, [
    locationFailedBody,
    locationFailedTitle,
    permissionDeniedBody,
    permissionDeniedTitle,
    scheduleReverse,
  ]);

  const handleConfirm = useCallback(() => {
    let label = addressLabel.trim();
    if (!label || label === reverseFailLabel) {
      label = `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`;
    }
    onConfirm({ lat: centerLat, lng: centerLng, addressLabel: label });
  }, [
    addressLabel,
    centerLat,
    centerLng,
    onConfirm,
    reverseFailLabel,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: "#0e1626",
        },
        header: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(14,22,38,0.92)",
        },
        headerBack: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(37,99,235,0.35)",
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "700",
          color: "#F3F4F6",
          paddingHorizontal: 8,
        },
        headerSpacer: {
          width: 44,
        },
        myLocationFab: {
          position: "absolute",
          top: insets.top + 72,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "rgba(37,99,235,0.95)",
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        centerOverlay: {
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          marginTop: -64,
          alignItems: "center",
          justifyContent: "flex-end",
        },
        animContainer: {
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 2,
        },
        addressPillWrap: {
          alignItems: "center",
        },
        addressPill: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: c.brand,
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          maxWidth: "88%",
        },
        addressPillLeft: {
          backgroundColor: c.cardBackground,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        addressPillLeftText: {
          fontSize: 14,
          fontWeight: "700",
          color: c.textPrimary,
        },
        addressPillRight: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexShrink: 1,
        },
        addressPillRightText: {
          fontSize: 14,
          fontWeight: "600",
          color: c.onBrand,
        },
        pinTriangle: {
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 10,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          marginTop: -1,
        },
        bigPinWrap: {
          alignItems: "center",
        },
        bigPinCircle: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.brand,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.35)",
        },
        bigPinDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#FFFFFF",
        },
        bigPinStem: {
          width: 4,
          height: 20,
          backgroundColor: c.brand,
          marginTop: -2,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        },
        pinShadow: {
          position: "absolute",
          bottom: -4,
          width: 16,
          height: 8,
          borderRadius: 8,
          backgroundColor: "#000000",
        },
        pinHintText: {
          position: "absolute",
          top: "100%",
          marginTop: 14,
          textAlign: "center",
          fontSize: 14,
          lineHeight: 20,
          paddingHorizontal: 12,
          color: "rgba(243,244,246,0.88)",
          width: 280,
        },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          backgroundColor: "rgba(14,22,38,0.94)",
        },
        confirmBtn: {
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: "center",
        },
        confirmBtnText: {
          fontSize: 16,
          fontWeight: "700",
        },
        footerHint: {
          marginTop: 10,
          textAlign: "center",
        },
      }),
    [insets.top],
  );

  const canConfirm = !!addressLabel && !reverseLoading && !mapMoving;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={HK_REGION}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          rotateEnabled={false}
          pitchEnabled={false}
          customMapStyle={MAP_DARK_STYLE}
        />

        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={styles.headerBack}
          >
            <IconSymbol name="chevron.left" size={22} color={c.onBrand} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Pressable
          style={styles.myLocationFab}
          onPress={() => {
            void handleMyLocation();
          }}
          disabled={locatingMe}
        >
          {locatingMe ? (
            <ActivityIndicator color={c.onBrand} size="small" />
          ) : (
            <IconSymbol name="location.fill" size={22} color={c.onBrand} />
          )}
        </Pressable>

        <View style={styles.centerOverlay} pointerEvents="none">
          <Animated.View style={[styles.animContainer, pinAnimatedStyle]}>
            {showAddress && !mapMoving ? (
              <View style={styles.addressPillWrap}>
                <View style={styles.addressPill}>
                  <View style={styles.addressPillLeft}>
                    <Text style={styles.addressPillLeftText}>由</Text>
                  </View>
                  <View style={styles.addressPillRight}>
                    {reverseLoading && !addressLabel ? (
                      <ActivityIndicator size="small" color={c.onBrand} />
                    ) : (
                      <Text
                        style={styles.addressPillRightText}
                        numberOfLines={1}
                      >
                        {addressLabel || addressLoadingLabel}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.pinTriangle, { borderTopColor: c.brand }]} />
              </View>
            ) : (
              <View style={styles.bigPinWrap}>
                <View style={styles.bigPinCircle}>
                  <View style={styles.bigPinDot} />
                </View>
                <View style={styles.bigPinStem} />
              </View>
            )}
            {!showAddress && !mapMoving && <Text style={styles.pinHintText}>{pinHint}</Text>}
          </Animated.View>
          <Animated.View style={[styles.pinShadow, shadowAnimatedStyle]} />
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: c.brand, opacity: canConfirm ? 1 : 0.4 },
            ]}
            onPress={handleConfirm}
            activeOpacity={0.88}
            disabled={!canConfirm}
          >
            <Text style={[styles.confirmBtnText, { color: c.onBrand }]}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>
          <ThemedText
            type="caption"
            style={[styles.footerHint, { color: c.textMuted }]}
            numberOfLines={2}
          >
            {dragHint}
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}
