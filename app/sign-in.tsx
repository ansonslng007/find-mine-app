import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROUTE_PATH } from "@/constants/routePath";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getMe, patchMe, signIn as signInRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  authenticateWithBiometric,
  canUseBiometricLogin,
} from "@/lib/auth/biometric";
import {
  hasBiometricCredentials,
  loadBiometricCredentials,
  saveBiometricCredentials,
} from "@/lib/auth/biometric-credentials";
import {
  getBiometricLoginEnabled,
  setBiometricLoginEnabled,
} from "@/lib/auth/biometric-prefs";
import { mapAuthErrorToMessage } from "@/lib/auth/map-auth-error";
import { mapBiometricErrorToMessage } from "@/lib/auth/map-biometric-error";
import { saveAuthUser } from "@/lib/auth/session";
import {
  clearAuthToken,
  getAuthToken,
  saveAuthToken,
} from "@/lib/auth/token-storage";
import { useI18n } from "@/providers/i18n-provider";

type AuthInputProps = Readonly<{
  icon: keyof typeof MaterialIcons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  right?: React.ReactNode;
}>;

function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  right,
}: AuthInputProps) {
  const inputRef = useRef<TextInput>(null);
  const c = useAppColors();
  const colorScheme = useColorScheme();
  const isLight = colorScheme !== "dark";
  const iconBg = isLight ? "#EEF2FF" : "#1E293B";
  const inputBg = isLight ? "#FFFFFF" : c.cardBackground;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          minHeight: 62,
          borderRadius: 18,
          backgroundColor: inputBg,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingVertical: 4,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isLight ? 0.08 : 0.2,
          shadowRadius: 7,
          elevation: 3,
        },
        iconCircle: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconBg,
          marginRight: 12,
        },
        inputWrap: {
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          justifyContent: "center",
        },
        input: {
          width: "100%",
          minHeight: 48,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
          color: c.textPrimary,
          fontSize: 16,
        },
      }),
    [c, iconBg, inputBg, isLight],
  );

  return (
    <Pressable
      style={styles.field}
      onPress={() => {
        inputRef.current?.focus();
      }}
    >
      <View style={styles.iconCircle} pointerEvents="none">
        <MaterialIcons name={icon} size={18} color={c.brand} />
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {right}
    </Pressable>
  );
}

type BiometricSignInDeps = Readonly<{
  t: (key: string) => string;
  setErrorMessage: (msg: string | null) => void;
  refreshBiometricRow: () => Promise<void>;
  replaceHome: () => void;
}>;

async function attemptBiometricSessionWithStoredJwt(
  deps: BiometricSignInDeps,
): Promise<"done" | "need_secure_store_sign_in"> {
  const token = await getAuthToken();
  if (!token) {
    return "need_secure_store_sign_in";
  }

  try {
    const { user } = await getMe();
    await saveAuthUser(user);
    deps.replaceHome();
    return "done";
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearAuthToken();
      return "need_secure_store_sign_in";
    }

    const creds = await loadBiometricCredentials();
    if (creds) {
      try {
        const { token: newToken, user } = await signInRequest({
          email: creds.email,
          password: creds.password,
        });
        await saveAuthToken(newToken);
        await saveAuthUser(user);
        try {
          const { user: fresh } = await getMe();
          await saveAuthUser(fresh);
        } catch {
          /* Same as above */
        }
        deps.replaceHome();
        return "done";
      } catch (signInErr) {
        deps.setErrorMessage(mapAuthErrorToMessage(signInErr, deps.t));
        await deps.refreshBiometricRow();
        return "done";
      }
    }

    try {
      const { user } = await getMe();
      await saveAuthUser(user);
    } catch {
      /* Still navigate home on network failure */
    }
    deps.replaceHome();
    return "done";
  }
}

async function completeBiometricSignInWithSecureStorePassword(
  deps: BiometricSignInDeps,
): Promise<void> {
  const creds = await loadBiometricCredentials();
  if (!creds) {
    deps.setErrorMessage(deps.t("auth.errors.biometricNeedPasswordLogin"));
    await deps.refreshBiometricRow();
    return;
  }

  try {
    const { token, user } = await signInRequest({
      email: creds.email,
      password: creds.password,
    });
    await saveAuthToken(token);
    await saveAuthUser(user);
  } catch (err) {
    deps.setErrorMessage(mapAuthErrorToMessage(err, deps.t));
    await deps.refreshBiometricRow();
    return;
  }

  try {
    const { user } = await getMe();
    await saveAuthUser(user);
  } catch {
    /* Profile tab will fetch again; still allow home on network failure */
  }
  deps.replaceHome();
}

export default function SignInScreen() {
  const router = useRouter();
  const c = useAppColors();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isLight = colorScheme !== "dark";
  const pageBg = isLight ? "#F4F4F5" : c.pageBackground;
  const surfaceBg = isLight ? "#F4F4F5" : c.pageBackground;
  const signUpBg = isLight ? "#EEF0F2" : c.cardBackground;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [biometricRowVisible, setBiometricRowVisible] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const formScrollRef = useRef<ScrollView | null>(null);

  const refreshBiometricRow = useCallback(async () => {
    const pref = await getBiometricLoginEnabled();
    const token = await getAuthToken();
    const storedCreds = await hasBiometricCredentials();
    const hardware = await canUseBiometricLogin();
    const canShowBio = hardware && pref && (!!token || storedCreds);
    setBiometricRowVisible(canShowBio);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshBiometricRow();
    }, [refreshBiometricRow]),
  );

  const handlePasswordSignIn = async () => {
    formScrollRef.current?.scrollTo({ y: 0, animated: true });
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage(t("auth.errors.fillAll"));
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await signInRequest({ email, password });
      await saveAuthToken(token);
      await saveAuthUser(user);
      await setBiometricLoginEnabled(user.biometricLoginEnabled);
      if (user.biometricLoginEnabled) {
        await saveBiometricCredentials(email.trim(), password);
      }
      const bioOk = await canUseBiometricLogin();
      if (bioOk && !user.biometricLoginEnabled) {
        Alert.alert(
          t("auth.biometricEnableTitle"),
          t("auth.biometricEnableBody"),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => {
                router.replace(ROUTE_PATH.HOME);
              },
            },
            {
              text: t("auth.biometricEnableConfirm"),
              onPress: () => {
                void (async () => {
                  await setBiometricLoginEnabled(true);
                  await saveBiometricCredentials(email.trim(), password);
                  try {
                    const { user } = await patchMe({
                      biometricLoginEnabled: true,
                    });
                    await saveAuthUser(user);
                  } catch {
                    /* Preference already persisted locally; profile can sync later */
                  }
                  router.replace(ROUTE_PATH.HOME);
                })();
              },
            },
          ],
        );
      } else {
        router.replace(ROUTE_PATH.HOME);
      }
    } catch (err) {
      setErrorMessage(mapAuthErrorToMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const replaceHome = useCallback(() => {
    router.replace(ROUTE_PATH.HOME as Href);
  }, [router]);

  const handleBiometricSignIn = async () => {
    setErrorMessage(null);
    setBiometricBusy(true);
    try {
      const authResult = await authenticateWithBiometric(
        t("auth.biometricPrompt"),
        t("common.cancel"),
      );
      if (!authResult.ok) {
        const msg = mapBiometricErrorToMessage(authResult.error, t);
        if (msg.length > 0) {
          setErrorMessage(msg);
        }
        return;
      }

      const deps: BiometricSignInDeps = {
        t,
        setErrorMessage,
        refreshBiometricRow,
        replaceHome,
      };

      const jwtStep = await attemptBiometricSessionWithStoredJwt(deps);
      if (jwtStep === "done") {
        return;
      }

      await completeBiometricSignInWithSecureStorePassword(deps);
    } finally {
      setBiometricBusy(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: pageBg,
        },
        keyboard: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 14,
        },
        panel: {
          width: "100%",
          maxWidth: 390,
          minHeight: "100%",
          borderRadius: 12,
          backgroundColor: surfaceBg,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 14,
        },
        logo: {
          width: 80,
          height: 80,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          backgroundColor: "#2F5DF5",
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isLight ? 0.18 : 0.32,
          shadowRadius: 14,
          elevation: 7,
        },
        title: {
          marginTop: 24,
          color: c.textPrimary,
          fontSize: 25,
          fontWeight: "800",
          textAlign: "center",
        },
        subtitle: {
          marginTop: 8,
          color: c.textMuted,
          fontSize: 16,
          lineHeight: 24,
          textAlign: "center",
        },
        form: {
          gap: 16,
          marginTop: 34,
        },
        eyeButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: -5,
        },
        errorBox: {
          minHeight: 46,
          borderRadius: 16,
          backgroundColor: "#F8DDE2",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        },
        errorText: {
          color: "#C21F32",
          fontSize: 14,
          textAlign: "center",
        },
        forgotButton: {
          alignSelf: "flex-end",
          marginTop: 12,
          paddingVertical: 4,
        },
        linkText: {
          color: c.brand,
          fontSize: 15,
          fontWeight: "600",
        },
        signInButton: {
          height: 57,
          borderRadius: 17,
          backgroundColor: "#2F5DF5",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
          shadowColor: "#2F5DF5",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 13,
          elevation: 6,
        },
        signInLabel: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "800",
        },
        dividerRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          marginTop: 34,
        },
        divider: {
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: c.borderSubtle,
        },
        dividerText: {
          color: c.textMuted,
          fontSize: 14,
        },
        signUpButton: {
          minHeight: 58,
          borderRadius: 16,
          backgroundColor: signUpBg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 24,
          paddingHorizontal: 14,
        },
        signUpMuted: {
          color: c.textMuted,
          fontSize: 14,
        },
        signUpText: {
          color: c.brand,
          fontSize: 16,
          fontWeight: "800",
          marginLeft: 4,
        },
        biometricButton: {
          height: 52,
          borderRadius: 17,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.brand,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 14,
        },
        biometricLabel: {
          color: c.brand,
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [c, isLight, pageBg, signUpBg, surfaceBg],
  );

  const visibilityIcon = passwordVisible ? "visibility-off" : "visibility";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          ref={formScrollRef}
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.panel}>
            <View style={styles.logo}>
              <MaterialIcons name="phone-iphone" size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>{t("signIn.title")}</Text>
            <Text style={styles.subtitle}>{t("signIn.subtitle")}</Text>

            <View style={styles.form}>
              <AuthInput
                icon="mail-outline"
                placeholder={t("signIn.emailPlaceholder")}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage(null);
                }}
                keyboardType="email-address"
              />

              <AuthInput
                icon="lock-outline"
                placeholder={t("signIn.passwordPlaceholder")}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrorMessage(null);
                }}
                secureTextEntry={!passwordVisible}
                right={
                  <Pressable
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={({ pressed }) => [
                      styles.eyeButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons
                      name={visibilityIcon}
                      size={22}
                      color={c.textMuted}
                    />
                  </Pressable>
                }
              />
            </View>

            {errorMessage !== null && (
              <View style={[styles.errorBox, { marginTop: 14 }]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Pressable
              onPress={() => undefined}
              style={({ pressed }) => [
                styles.forgotButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.linkText}>{t("signIn.forgotPassword")}</Text>
            </Pressable>

            <Pressable
              onPress={() => void handlePasswordSignIn()}
              disabled={submitting}
              style={({ pressed }) => [
                styles.signInButton,
                pressed && !submitting && { opacity: 0.92 },
                submitting && { opacity: 0.75 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInLabel}>{t("signIn.signIn")}</Text>
              )}
            </Pressable>

            {biometricRowVisible ? (
              <Pressable
                onPress={() => void handleBiometricSignIn()}
                disabled={biometricBusy}
                style={({ pressed }) => [
                  styles.biometricButton,
                  pressed && !biometricBusy && { opacity: 0.85 },
                  biometricBusy && { opacity: 0.7 },
                ]}
              >
                {biometricBusy ? (
                  <ActivityIndicator color={c.brand} />
                ) : (
                  <Text style={styles.biometricLabel}>
                    {t("auth.biometricLogin")}
                  </Text>
                )}
              </Pressable>
            ) : null}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t("signIn.continueWith")}</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              onPress={() => router.push(ROUTE_PATH.SIGN_UP)}
              style={({ pressed }) => [
                styles.signUpButton,
                pressed && { opacity: 0.82 },
              ]}
            >
              <Text style={styles.signUpMuted}>{t("signIn.noAccount")}</Text>
              <Text style={styles.signUpText}>{t("signIn.signUp")}</Text>
              <MaterialIcons name="chevron-right" size={22} color={c.brand} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
