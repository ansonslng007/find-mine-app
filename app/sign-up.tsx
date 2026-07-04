import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
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

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { patchMe, signUp as signUpRequest } from "@/lib/api/auth";
import { canUseBiometricLogin } from "@/lib/auth/biometric";
import { saveBiometricCredentials } from "@/lib/auth/biometric-credentials";
import { setBiometricLoginEnabled } from "@/lib/auth/biometric-prefs";
import { mapAuthErrorToMessage } from "@/lib/auth/map-auth-error";
import { saveAuthUser } from "@/lib/auth/session";
import { saveAuthToken } from "@/lib/auth/token-storage";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useI18n } from "@/providers/i18n-provider";

const BRAND_GREEN = "#22C55E";

type SignUpInputProps = Readonly<{
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  right?: React.ReactNode;
}>;

function SignUpInput({
  icon,
  iconBg,
  iconColor,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  right,
}: SignUpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const c = useAppColors();
  const colorScheme = useColorScheme();
  const isLight = colorScheme !== "dark";
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
    [c, inputBg, isLight],
  );

  return (
    <Pressable
      style={styles.field}
      onPress={() => {
        inputRef.current?.focus();
      }}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]} pointerEvents="none">
        <MaterialIcons name={icon} size={18} color={iconColor} />
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
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
          {...(secureTextEntry &&
            Platform.OS === "ios" && {
              textContentType: "none" as const,
            })}
          {...(secureTextEntry &&
            Platform.OS === "android" && {
              importantForAutofill: "no" as const,
            })}
        />
      </View>
      {right}
    </Pressable>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const c = useAppColors();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isLight = colorScheme !== "dark";

  const iconNameBg = isLight ? "#DCFCE7" : "#14532D";
  const iconNameColor = isLight ? "#15803D" : "#86EFAC";
  const iconEmailBg = isLight ? "#DBEAFE" : "#1E3A5F";
  const iconEmailColor = isLight ? "#2563EB" : "#93C5FD";
  const iconLockBg = isLight ? "#FFEDD5" : "#7C2D12";
  const iconLockColor = isLight ? "#EA580C" : "#FDBA74";

  const pageBg = isLight ? "#F4F4F5" : c.pageBackground;
  const surfaceBg = isLight ? "#F4F4F5" : c.pageBackground;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formScrollRef = useRef<ScrollView | null>(null);

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
        backRow: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          marginBottom: 12,
        },
        backLabel: {
          fontSize: 16,
          fontWeight: "600",
          color: c.brand,
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
          backgroundColor: BRAND_GREEN,
          shadowColor: BRAND_GREEN,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isLight ? 0.28 : 0.4,
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
        eyeButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: -5,
        },
        primaryButton: {
          height: 57,
          borderRadius: 17,
          backgroundColor: BRAND_GREEN,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 22,
          shadowColor: BRAND_GREEN,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 13,
          elevation: 6,
        },
        primaryLabel: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "800",
        },
      }),
    [c, isLight, pageBg, surfaceBg],
  );

  const handleCreateAccount = async () => {
    formScrollRef.current?.scrollTo({ y: 0, animated: true });
    setErrorMessage(null);
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage(t("auth.errors.fillAll"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("auth.errors.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setErrorMessage(t("auth.errors.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await signUpRequest({
        email,
        password,
        fullName: fullName.trim() || undefined,
      });
      await saveAuthToken(token);
      await saveAuthUser(user);
      const bioOk = await canUseBiometricLogin();
      if (bioOk) {
        Alert.alert(
          t("auth.biometricEnableTitle"),
          t("auth.biometricEnableBody"),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => {
                void (async () => {
                  await setBiometricLoginEnabled(false);
                  router.replace(ROUTE_PATH.HOME);
                })();
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
                    /* Preference already persisted locally */
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

  const pwIcon = passwordVisible ? "visibility-off" : "visibility";
  const cfIcon = confirmVisible ? "visibility-off" : "visibility";

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
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backRow,
                pressed && { opacity: 0.75 },
              ]}
            >
              <IconSymbol name="chevron.left" size={22} color={c.brand} />
              <ThemedText style={[styles.backLabel, { marginLeft: 4 }]}>
                {t("settings.back")}
              </ThemedText>
            </Pressable>

            <View style={styles.logo}>
              <MaterialIcons name="phone-iphone" size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>{t("signUp.title")}</Text>
            <Text style={styles.subtitle}>{t("signUp.subtitle")}</Text>

            <View style={styles.form}>
              <SignUpInput
                icon="person-outline"
                iconBg={iconNameBg}
                iconColor={iconNameColor}
                placeholder={t("signUp.fullNamePlaceholder")}
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  setErrorMessage(null);
                }}
                autoCapitalize="words"
              />

              <SignUpInput
                icon="mail-outline"
                iconBg={iconEmailBg}
                iconColor={iconEmailColor}
                placeholder={t("signUp.emailPlaceholder")}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setErrorMessage(null);
                }}
                keyboardType="email-address"
              />

              <SignUpInput
                icon="lock-outline"
                iconBg={iconLockBg}
                iconColor={iconLockColor}
                placeholder={t("signUp.passwordPlaceholder")}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setErrorMessage(null);
                }}
                secureTextEntry={!passwordVisible}
                right={
                  <Pressable
                    onPress={() => setPasswordVisible((v) => !v)}
                    style={({ pressed }) => [
                      styles.eyeButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name={pwIcon} size={22} color={c.textMuted} />
                  </Pressable>
                }
              />

              <SignUpInput
                icon="lock-outline"
                iconBg={iconLockBg}
                iconColor={iconLockColor}
                placeholder={t("signUp.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrorMessage(null);
                }}
                secureTextEntry={!confirmVisible}
                right={
                  <Pressable
                    onPress={() => setConfirmVisible((v) => !v)}
                    style={({ pressed }) => [
                      styles.eyeButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name={cfIcon} size={22} color={c.textMuted} />
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
              onPress={() => void handleCreateAccount()}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !submitting && { opacity: 0.92 },
                submitting && { opacity: 0.75 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryLabel}>{t("signUp.createAccount")}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
