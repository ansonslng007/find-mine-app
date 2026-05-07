import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { ApiError } from "@/lib/api/client";
import {
  getMe,
  patchMe,
  signIn as signInRequest,
  type AuthUser,
} from "@/lib/api/auth";
import { authenticateWithBiometric, canUseBiometricLogin } from "@/lib/auth/biometric";
import {
  hasBiometricCredentials,
  saveBiometricCredentials,
} from "@/lib/auth/biometric-credentials";
import { setBiometricLoginEnabled } from "@/lib/auth/biometric-prefs";
import { mapAuthErrorToMessage } from "@/lib/auth/map-auth-error";
import { mapBiometricErrorToMessage } from "@/lib/auth/map-biometric-error";
import {
  clearAuthSession,
  loadAuthUser,
  saveAuthUser,
} from "@/lib/auth/session";
import { getAuthToken, saveAuthToken } from "@/lib/auth/token-storage";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useI18n } from "@/providers/i18n-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type ProfileCardProps = Readonly<{
  title: string;
  subtitle: string;
  left: React.ReactNode;
  onPress?: () => void;
  titleColor?: string;
}>;

function ProfileCard({
  title,
  subtitle,
  left,
  onPress,
  titleColor,
}: ProfileCardProps) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        textCol: {
          flex: 1,
          marginLeft: 14,
        },
        subtitle: {
          marginTop: 4,
        },
      }),
    [c],
  );

  const content = (
    <View style={styles.card}>
      {left}
      <View style={styles.textCol}>
        <ThemedText
          type="cardTitle"
          style={titleColor === undefined ? undefined : { color: titleColor }}
        >
          {title}
        </ThemedText>
        <ThemedText type="bodyMuted" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

type ProfileSessionPhase = "loading" | "guest" | "member";

function memberDisplayTitle(user: AuthUser): string {
  const name = user.displayName?.trim();
  if (name) {
    return name;
  }
  const at = user.email.indexOf("@");
  if (at > 0) {
    return user.email.slice(0, at);
  }
  return user.email;
}

type MemberBiometricCardProps = Readonly<{
  enabled: boolean;
  busy: boolean;
  onValueChange: (value: boolean) => void;
}>;

function MemberBiometricCard({
  enabled,
  busy,
  onValueChange,
}: MemberBiometricCardProps) {
  const c = useAppColors();
  const { t } = useI18n();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        iconCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.chipBackground,
        },
        textCol: {
          flex: 1,
          marginLeft: 14,
          marginRight: 8,
        },
        subtitle: {
          marginTop: 4,
        },
      }),
    [c],
  );

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="fingerprint" size={24} color={c.textPrimary} />
      </View>
      <View style={styles.textCol}>
        <ThemedText type="cardTitle">{t("profile.biometricTitle")}</ThemedText>
        <ThemedText type="bodyMuted" style={styles.subtitle}>
          {t("profile.biometricSubtitle")}
        </ThemedText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onValueChange}
        disabled={busy}
        trackColor={{ false: c.borderSubtle, true: c.brand }}
        thumbColor={c.cardBackground}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const c = useAppColors();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isLight = colorScheme !== "dark";
  const userIconCircleBg = isLight ? "#DBEAFE" : "#1E3A5F";
  const smallIconCircleBg = isLight ? "#E5E7EB" : c.chipBackground;
  const memberIconBg = isLight ? "#DCFCE7" : "#14532D";

  const [phase, setPhase] = useState<ProfileSessionPhase>("loading");
  const [memberUser, setMemberUser] = useState<AuthUser | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordModalError, setPasswordModalError] = useState<string | null>(
    null,
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        largeUserIcon: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: userIconCircleBg,
          alignItems: "center",
          justifyContent: "center",
        },
        memberUserIcon: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: memberIconBg,
          alignItems: "center",
          justifyContent: "center",
        },
        smallIconCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: smallIconCircleBg,
          alignItems: "center",
          justifyContent: "center",
        },
        signOutIconCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: isLight ? "#FEE2E2" : "#450A0A",
          alignItems: "center",
          justifyContent: "center",
        },
        loadingBox: {
          paddingVertical: 28,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [userIconCircleBg, smallIconCircleBg, memberIconBg, isLight],
  );

  const refreshSession = useCallback(async () => {
    setPhase("loading");
    const token = await getAuthToken();
    if (!token) {
      setMemberUser(null);
      setPhase("guest");
      return;
    }

    try {
      const { user } = await getMe();
      await saveAuthUser(user);
      await setBiometricLoginEnabled(user.biometricLoginEnabled);
      setMemberUser(user);
      setPhase("member");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearAuthSession();
        setMemberUser(null);
        setPhase("guest");
        return;
      }
      const cached = await loadAuthUser();
      if (cached) {
        await setBiometricLoginEnabled(cached.biometricLoginEnabled);
        setMemberUser(cached);
        setPhase("member");
      } else {
        setMemberUser(null);
        setPhase("guest");
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSession();
    }, [refreshSession]),
  );

  const disableBiometricFlow = useCallback(async () => {
    setBioBusy(true);
    try {
      const { user } = await patchMe({ biometricLoginEnabled: false });
      await setBiometricLoginEnabled(false);
      await saveAuthUser(user);
      setMemberUser(user);
    } catch (err) {
      Alert.alert("", mapAuthErrorToMessage(err, t));
    } finally {
      setBioBusy(false);
    }
  }, [t]);

  const enableBiometricFlow = useCallback(async () => {
    setBioBusy(true);
    try {
      const hw = await canUseBiometricLogin();
      if (!hw) {
        Alert.alert("", t("profile.biometricHardwareUnavailable"));
        return;
      }
      const hasCreds = await hasBiometricCredentials();
      if (!hasCreds) {
        setPasswordDraft("");
        setPasswordModalError(null);
        setPasswordModalVisible(true);
        return;
      }
      const authResult = await authenticateWithBiometric(
        t("auth.biometricPrompt"),
        t("common.cancel"),
      );
      if (!authResult.ok) {
        const msg = mapBiometricErrorToMessage(authResult.error, t);
        if (msg.length > 0) {
          Alert.alert("", msg);
        }
        return;
      }
      const { user } = await patchMe({ biometricLoginEnabled: true });
      await setBiometricLoginEnabled(true);
      await saveAuthUser(user);
      setMemberUser(user);
    } catch (err) {
      Alert.alert("", mapAuthErrorToMessage(err, t));
    } finally {
      setBioBusy(false);
    }
  }, [t]);

  const submitPasswordForBiometric = useCallback(async () => {
    if (!memberUser) {
      return;
    }
    if (!passwordDraft.trim()) {
      setPasswordModalError(t("auth.errors.fillAll"));
      return;
    }
    setPasswordModalError(null);
    setBioBusy(true);
    try {
      const { token, user } = await signInRequest({
        email: memberUser.email,
        password: passwordDraft,
      });
      await saveAuthToken(token);
      await saveAuthUser(user);
      await saveBiometricCredentials(memberUser.email, passwordDraft);
      setPasswordModalVisible(false);
      setPasswordDraft("");
      const authResult = await authenticateWithBiometric(
        t("auth.biometricPrompt"),
        t("common.cancel"),
      );
      if (!authResult.ok) {
        const msg = mapBiometricErrorToMessage(authResult.error, t);
        if (msg.length > 0) {
          Alert.alert("", msg);
        }
        return;
      }
      const { user: patched } = await patchMe({ biometricLoginEnabled: true });
      await setBiometricLoginEnabled(true);
      await saveAuthUser(patched);
      setMemberUser(patched);
    } catch (err) {
      setPasswordModalError(mapAuthErrorToMessage(err, t));
    } finally {
      setBioBusy(false);
    }
  }, [memberUser, passwordDraft, t]);

  const handleBiometricToggle = useCallback(
    (next: boolean) => {
      if (bioBusy) {
        return;
      }
      if (next) {
        void enableBiometricFlow();
      } else {
        void disableBiometricFlow();
      }
    },
    [bioBusy, disableBiometricFlow, enableBiometricFlow],
  );

  const modalStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        },
        sheet: {
          borderRadius: 16,
          padding: 20,
          backgroundColor: c.cardBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
        },
        modalTitle: {
          fontSize: 18,
          fontWeight: "700",
          color: c.textPrimary,
        },
        modalBody: {
          marginTop: 10,
          fontSize: 15,
          lineHeight: 22,
          color: c.textMuted,
        },
        input: {
          marginTop: 14,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: c.textPrimary,
        },
        modalActions: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 18,
        },
        modalBtnLabel: {
          fontSize: 16,
          fontWeight: "600",
          color: c.brand,
        },
        modalBtnLabelMuted: {
          fontSize: 16,
          fontWeight: "600",
          color: c.textMuted,
        },
        modalError: {
          marginTop: 8,
          fontSize: 14,
          color: c.badgeLost,
        },
      }),
    [c],
  );

  const handleSignOut = () => {
    Alert.alert(t("profile.signOutConfirmTitle"), t("profile.signOutConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOutTitle"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            await clearAuthSession();
            setMemberUser(null);
            setPhase("guest");
          })();
        },
      },
    ]);
  };

  let accountCard: React.ReactNode;
  if (phase === "loading") {
    accountCard = (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={c.brand} />
      </View>
    );
  } else if (phase === "member" && memberUser) {
    accountCard = (
      <ProfileCard
        title={memberDisplayTitle(memberUser)}
        subtitle={memberUser.email}
        left={
          <View style={styles.memberUserIcon}>
            <IconSymbol name="person.fill" size={28} color={c.badgeFound} />
          </View>
        }
      />
    );
  } else {
    accountCard = (
      <ProfileCard
        title={t("profile.guestTitle")}
        subtitle={t("profile.guestSubtitle")}
        onPress={() => router.push(ROUTE_PATH.SIGN_IN)}
        left={
          <View style={styles.largeUserIcon}>
            <IconSymbol name="person.fill" size={28} color={c.brand} />
          </View>
        }
      />
    );
  }

  return (
    <PageLayoutWithHeader
      screenTitle={t("profile.title")}
      screenSubtitle={t("profile.subtitle")}
      icon="shippingbox.fill"
    >
      {accountCard}

      {phase === "member" && memberUser ? (
        <>
          <MemberBiometricCard
            enabled={memberUser.biometricLoginEnabled}
            busy={bioBusy}
            onValueChange={handleBiometricToggle}
          />
          <Modal
            visible={passwordModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setPasswordModalVisible(false);
              setPasswordDraft("");
              setPasswordModalError(null);
            }}
          >
            <View style={modalStyles.overlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setPasswordDraft("");
                  setPasswordModalError(null);
                }}
              />
              <View style={modalStyles.sheet}>
                <ThemedText style={modalStyles.modalTitle}>
                  {t("profile.biometricPasswordTitle")}
                </ThemedText>
                <ThemedText style={modalStyles.modalBody}>
                  {t("profile.biometricPasswordBody")}
                </ThemedText>
                <TextInput
                  value={passwordDraft}
                  onChangeText={setPasswordDraft}
                  placeholder={t("profile.biometricPasswordPlaceholder")}
                  placeholderTextColor={c.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!bioBusy}
                  style={modalStyles.input}
                />
                {passwordModalError ? (
                  <ThemedText style={modalStyles.modalError}>
                    {passwordModalError}
                  </ThemedText>
                ) : null}
                <View style={modalStyles.modalActions}>
                  <Pressable
                    onPress={() => {
                      setPasswordModalVisible(false);
                      setPasswordDraft("");
                      setPasswordModalError(null);
                    }}
                    disabled={bioBusy}
                  >
                    <ThemedText style={modalStyles.modalBtnLabelMuted}>
                      {t("common.cancel")}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void submitPasswordForBiometric();
                    }}
                    disabled={bioBusy}
                  >
                    <ThemedText style={modalStyles.modalBtnLabel}>
                      {t("profile.biometricPasswordContinue")}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}

      <ProfileCard
        title={t("profile.settingsTitle")}
        subtitle={t("profile.settingsSubtitle")}
        onPress={() => router.push(ROUTE_PATH.SETTINGS)}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="gearshape.fill" size={24} color={c.textPrimary} />
          </View>
        }
      />

      <ProfileCard
        title={t("profile.helpTitle")}
        subtitle={t("profile.helpSubtitle")}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol
              name="questionmark.circle"
              size={24}
              color={c.textPrimary}
            />
          </View>
        }
      />

      <ProfileCard
        title={t("profile.aboutTitle")}
        subtitle={t("profile.aboutVersion", { version: APP_VERSION })}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="info.circle" size={24} color={c.textPrimary} />
          </View>
        }
      />

      {phase === "member" && memberUser ? (
        <ProfileCard
          title={t("profile.signOutTitle")}
          subtitle={t("profile.signOutSubtitle")}
          titleColor={c.badgeLost}
          onPress={handleSignOut}
          left={
            <View style={styles.signOutIconCircle}>
              <MaterialIcons name="logout" size={24} color={c.badgeLost} />
            </View>
          }
        />
      ) : null}
    </PageLayoutWithHeader>
  );
}
