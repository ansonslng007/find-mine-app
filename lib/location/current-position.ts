import * as Location from "expo-location";

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

export async function getCurrentOrLastKnownPositionAsync() {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch (currentError) {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: 500,
    });

    if (lastKnown) {
      return lastKnown;
    }

    throw currentError;
  }
}
