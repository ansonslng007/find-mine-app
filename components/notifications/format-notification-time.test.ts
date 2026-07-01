import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { formatNotificationTime } from "./format-notification-time";

describe("formatNotificationTime", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("formats very recent notifications as just now", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T12:00:30.000Z"));

    expect(formatNotificationTime("2026-06-01T12:00:00.000Z", "en")).toBe(
      "Just now",
    );
  });

  it("formats minute, hour, and day differences", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-08T12:00:00.000Z"));

    expect(formatNotificationTime("2026-06-08T11:45:00.000Z", "en")).toBe(
      "15 min",
    );
    expect(formatNotificationTime("2026-06-08T09:00:00.000Z", "en")).toBe(
      "3 hr",
    );
    expect(formatNotificationTime("2026-06-05T12:00:00.000Z", "en")).toBe(
      "3 d",
    );
  });

  it("falls back to a short date after a week", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    expect(formatNotificationTime("2026-06-01T12:00:00.000Z", "en")).toBe(
      "6/1",
    );
  });
});
