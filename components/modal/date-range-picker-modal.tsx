import { ThemedText } from "@/components/themed-text";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

type PeriodMarkedDates = Record<
  string,
  {
    color: string;
    textColor: string;
    startingDay?: boolean;
    endingDay?: boolean;
  }
>;

type DraftRange = Readonly<{
  start: string | null;
  end: string | null;
}>;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD strings compare lexicographically. Clamp ymd to at most maxYmd (inclusive). */
function clampYmd(ymd: string, maxYmd: string): string {
  if (ymd > maxYmd) {
    return maxYmd;
  }
  return ymd;
}

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, m - 1, d);
}

function buildPeriodMarkedDates(
  startYmd: string | null,
  endYmd: string | null,
  periodColor: string,
  periodTextColor: string,
): PeriodMarkedDates {
  const out: PeriodMarkedDates = {};
  if (startYmd == null) {
    return out;
  }
  const dayMark = (startingDay: boolean, endingDay: boolean) => ({
    color: periodColor,
    textColor: periodTextColor,
    startingDay,
    endingDay,
  });
  if (endYmd == null || startYmd === endYmd) {
    out[startYmd] = dayMark(true, true);
    return out;
  }
  const lo = startYmd < endYmd ? startYmd : endYmd;
  const hi = startYmd < endYmd ? endYmd : startYmd;
  const cur = parseLocalYmd(lo);
  const endD = parseLocalYmd(hi);
  while (cur.getTime() <= endD.getTime()) {
    const ds = toLocalYmd(cur);
    out[ds] = dayMark(ds === lo, ds === hi);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  clearLabel: string;
  doneLabel: string;
  occurredFrom: Date | null;
  occurredTo: Date | null;
  onChangeOccurredFrom: (d: Date | null) => void;
  onChangeOccurredTo: (d: Date | null) => void;
  onClearOccurredRange: () => void;
}>;

export function DateRangePickerModal({
  visible,
  onClose,
  title,
  hint,
  clearLabel,
  doneLabel,
  occurredFrom,
  occurredTo,
  onChangeOccurredFrom,
  onChangeOccurredTo,
  onClearOccurredRange,
}: Props) {
  const c = useAppColors();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(c), [c]);

  const [draft, setDraft] = useState<DraftRange>({ start: null, end: null });

  const todayYmd = toLocalYmd(new Date());

  useEffect(() => {
    if (visible) {
      const max = todayYmd;
      const startRaw = occurredFrom != null ? toLocalYmd(occurredFrom) : null;
      const endRaw = occurredTo != null ? toLocalYmd(occurredTo) : null;
      const start = startRaw != null ? clampYmd(startRaw, max) : null;
      const end = endRaw != null ? clampYmd(endRaw, max) : null;
      if (start != null && end != null && start > end) {
        setDraft({ start: end, end: start });
      } else {
        setDraft({ start, end });
      }
    }
  }, [visible, occurredFrom, occurredTo, todayYmd]);

  const markedDates = useMemo(
    () =>
      buildPeriodMarkedDates(draft.start, draft.end, c.brandSoft, c.brand),
    [draft.start, draft.end, c.brandSoft, c.brand],
  );

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: c.cardBackground,
      textSectionTitleColor: c.textMuted,
      selectedDayBackgroundColor: c.brand,
      selectedDayTextColor: c.onBrand,
      todayTextColor: c.brand,
      dayTextColor: c.textPrimary,
      textDisabledColor: c.textMuted,
      monthTextColor: c.textPrimary,
      arrowColor: c.brand,
      textDayFontSize: 15,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 12,
    }),
    [c],
  );

  const calendarCurrent = draft.end ?? draft.start ?? todayYmd;

  const onDayPress = (day: DateData) => {
    const s = day.dateString;
    if (s > todayYmd) {
      return;
    }
    setDraft((prev) => {
      if (prev.start == null || (prev.start != null && prev.end != null)) {
        return { start: s, end: null };
      }
      if (s < prev.start) {
        return { start: s, end: prev.start };
      }
      return { start: prev.start, end: s };
    });
  };

  const applyDraftAndClose = () => {
    const max = todayYmd;
    if (draft.start != null && draft.end != null) {
      let lo = draft.start < draft.end ? draft.start : draft.end;
      let hi = draft.start < draft.end ? draft.end : draft.start;
      lo = clampYmd(lo, max);
      hi = clampYmd(hi, max);
      if (lo > hi) {
        hi = lo;
      }
      onChangeOccurredFrom(startOfLocalDay(parseLocalYmd(lo)));
      onChangeOccurredTo(endOfLocalDay(parseLocalYmd(hi)));
    } else if (draft.start != null && draft.end == null) {
      const ymd = clampYmd(draft.start, max);
      const d = parseLocalYmd(ymd);
      onChangeOccurredFrom(startOfLocalDay(d));
      onChangeOccurredTo(endOfLocalDay(d));
    }
    onClose();
  };

  const clearInModal = () => {
    onClearOccurredRange();
    setDraft({ start: null, end: null });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {title}
          </ThemedText>
          <ThemedText type="bodyMuted" style={styles.modalHint}>
            {hint}
          </ThemedText>
          <Calendar
            markingType="period"
            markedDates={markedDates}
            onDayPress={onDayPress}
            theme={calendarTheme}
            enableSwipeMonths
            current={calendarCurrent}
            maxDate={todayYmd}
          />
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={clearInModal}
            >
              <ThemedText type="link">{clearLabel}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={onClose}
            >
              <ThemedText type="body">{t("common.cancel")}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={applyDraftAndClose}
            >
              <ThemedText type="defaultSemiBold" style={{ color: c.onBrand }}>
                {doneLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(c: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      borderRadius: 16,
      padding: 12,
      backgroundColor: c.cardBackground,
      maxHeight: "90%",
    },
    modalTitle: {
      marginBottom: 6,
      textAlign: "center",
    },
    modalHint: {
      marginBottom: 10,
      textAlign: "center",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      gap: 8,
    },
    modalBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    modalBtnPrimary: {
      backgroundColor: c.brand,
    },
    modalBtnGhost: {
      backgroundColor: "transparent",
    },
  });
}
