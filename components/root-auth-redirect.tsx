import { getAuthToken } from "@/lib/auth/token-storage";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

void SplashScreen.preventAutoHideAsync();

/**
 * Requires auth for all routes except sign-in / sign-up.
 * Sends logged-in users away from auth screens toward main tabs.
 */
export function RootAuthRedirect() {
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = await getAuthToken();
      if (cancelled) {
        return;
      }

      const top = segments[0];
      const atAuthScreen =
        top === "sign-in" || top === "sign-up";

      if (!top) {
        if (!token) {
          router.replace("/sign-in");
        }
      } else if (!token && !atAuthScreen) {
        router.replace("/sign-in");
      } else if (token && atAuthScreen) {
        router.replace("/(tabs)");
      }

      if (!splashHidden.current) {
        splashHidden.current = true;
        await SplashScreen.hideAsync();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [segments, router]);

  return null;
}
