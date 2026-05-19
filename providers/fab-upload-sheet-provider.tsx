import {
  SearchByImageSheet,
  type SheetStatusKind,
} from "@/components/modal/search-by-image-sheet";
import { PillButton } from "@/components/ui/pill-button";
import { ApiError } from "@/lib/api/client";
import { analyzeItemImage } from "@/lib/api/items";
import { useI18n } from "@/providers/i18n-provider";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Alert, StyleSheet, View } from "react-native";

export type FabFormDraft = Readonly<{
  imageUri: string;
  imageMime: string;
  category: string;
  description: string;
  title?: string;
}>;

type FabUploadContextValue = Readonly<{
  openFabSheet: () => void;
  pendingDraft: FabFormDraft | null;
  consumeDraft: () => void;
}>;

const FabUploadContext = createContext<FabUploadContextValue | null>(null);

const FAB_UPLOAD_NOOP: FabUploadContextValue = {
  openFabSheet: () => {},
  pendingDraft: null,
  consumeDraft: () => {},
};

export function useFabUploadSheet(): FabUploadContextValue {
  const ctx = useContext(FabUploadContext);
  if (!ctx) {
    throw new Error(
      "useFabUploadSheet must be used within FabUploadSheetProvider",
    );
  }
  return ctx;
}

/** Safe outside tabs; returns no-op handlers and no draft (e.g. item edit screen). */
export function useOptionalFabUploadSheet(): FabUploadContextValue {
  const ctx = useContext(FabUploadContext);
  return ctx ?? FAB_UPLOAD_NOOP;
}

type BusyPhase = "idle" | "analyze";

type FabUploadSheetProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function FabUploadSheetProvider({
  children,
}: FabUploadSheetProviderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busyPhase, setBusyPhase] = useState<BusyPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<FabFormDraft | null>(null);

  const consumeDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  const openFabSheet = useCallback(() => {
    setErrorMessage(null);
    setVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (busyPhase !== "idle") {
      return;
    }
    setVisible(false);
    setErrorMessage(null);
  }, [busyPhase]);

  const runAfterPick = async (uri: string, mime: string) => {
    setErrorMessage(null);
    setBusyPhase("analyze");
    try {
      const analysis = await analyzeItemImage({ uri, mime });
      setPendingDraft({
        imageUri: uri,
        imageMime: mime,
        category: analysis.category,
        description: analysis.description,
        title: analysis.title,
      });
      setVisible(false);
      setBusyPhase("idle");
      router.push("/(tabs)/post");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setErrorMessage(t("fabUpload.needSignIn"));
        } else {
          setErrorMessage(e.message);
        }
      } else {
        setErrorMessage(t("form.classifyFail"));
      }
      setBusyPhase("idle");
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("form.permCameraTitle"), t("form.permCameraBody"));
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
    await runAfterPick(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("form.permGalleryTitle"), t("form.permGalleryBody"));
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
    await runAfterPick(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const handleGoToForm = useCallback(() => {
    if (busyPhase !== "idle") {
      return;
    }
    setVisible(false);
    setErrorMessage(null);
    router.push("/(tabs)/post");
  }, [busyPhase, router]);

  const isBusy = busyPhase !== "idle";
  let statusKind: SheetStatusKind = "idle";
  if (busyPhase === "analyze") {
    statusKind = "analyze";
  }

  const fabFooter = (
    <View style={fabFooterStyles.wrap}>
      <PillButton
        label={t("fabUpload.goToForm")}
        onPress={handleGoToForm}
        disabled={isBusy}
      />
    </View>
  );

  const ctxValue = useMemo(
    () => ({
      openFabSheet,
      pendingDraft,
      consumeDraft,
    }),
    [openFabSheet, pendingDraft, consumeDraft],
  );

  return (
    <FabUploadContext.Provider value={ctxValue}>
      {children}
      <SearchByImageSheet
        visible={visible}
        onClose={closeSheet}
        onTakePhoto={handleTakePhoto}
        onPickLibrary={handlePickFromLibrary}
        isBusy={isBusy}
        statusKind={statusKind}
        errorMessage={errorMessage}
        presentation="fabUpload"
        scope="lostHome"
        fabFooter={fabFooter}
      />
    </FabUploadContext.Provider>
  );
}

const fabFooterStyles = StyleSheet.create({
  wrap: {
    alignItems: "stretch",
  },
});
