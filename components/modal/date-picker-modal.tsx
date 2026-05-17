import { useAppColors } from "@/hooks/use-app-colors";
import React, { useMemo } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  currentDate: string;
  maxDate?: string;
  selectedDateString?: string;
  onDayPress: (day: DateData) => void;
}>;

export function DatePickerModal({
  visible,
  onClose,
  currentDate,
  maxDate,
  selectedDateString,
  onDayPress,
}: Props) {
  const c = useAppColors();
  const styles = useMemo(() => createStyles(c), [c]);

  const markedDates = useMemo(() => {
    if (selectedDateString) {
      return {
        [selectedDateString]: {
          selected: true,
          selectedColor: c.brand,
        },
      };
    }
    return undefined;
  }, [selectedDateString, c.brand]);

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: c.cardBackground,
      textSectionTitleColor: c.textMuted,
      dayTextColor: c.textPrimary,
      monthTextColor: c.textPrimary,
      arrowColor: c.brand,
      selectedDayBackgroundColor: c.brand,
      selectedDayTextColor: c.onBrand,
      todayTextColor: c.brand,
    }),
    [c],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.calendarModalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.calendarModalCard,
            {
              backgroundColor: c.cardBackground,
              borderColor: c.borderSubtle,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Calendar
            current={currentDate}
            maxDate={maxDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={calendarTheme}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(c: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    calendarModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    calendarModalCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
      paddingBottom: 8,
    },
  });
}
