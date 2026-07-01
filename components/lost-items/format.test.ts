import { describe, expect, it, jest } from "@jest/globals";

import type { Item } from "@/lib/api/items";
import {
  formatItemRewardAmount,
  formatRelativeTime,
  hasDisplayableReward,
  itemMatchesOccurredRange,
  itemMatchesSearchGeo,
  passesCategoryChip,
} from "./format";

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "lost",
    title: "Black wallet",
    description: "Small leather wallet",
    category: "wallet",
    locationText: "Central",
    locationLatitude: 22.281,
    locationLongitude: 114.158,
    occurredAt: "2026-06-01T10:00:00.000Z",
    imageUrl: "https://example.com/item.jpg",
    imageSha256: null,
    status: "open",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    postedBy: null,
    sourcePostUrl: null,
    platform: null,
    rewardAmount: null,
    ...overrides,
  };
}

describe("lost item formatting helpers", () => {
  it("formats relative time with translation keys", () => {
    const tracker = jest.spyOn(Date, "now").mockReturnValue(
      new Date("2026-06-01T11:30:00.000Z").getTime(),
    );
    try {
      const translated = formatRelativeTime(
        "2026-06-01T10:00:00.000Z",
        (key, options) => `${key}:${options?.count ?? ""}`,
        "en",
      );
      expect(translated).toBe("time.hoursAgo:1");
    } finally {
      tracker.mockRestore();
    }
  });

  it("shows rewards only for lost items with positive finite amounts", () => {
    expect(hasDisplayableReward(item({ rewardAmount: 50 }))).toBe(true);
    expect(hasDisplayableReward(item({ rewardAmount: 0 }))).toBe(false);
    expect(
      hasDisplayableReward(item({ kind: "found", rewardAmount: 50 })),
    ).toBe(false);
  });

  it("formats reward amounts for Hong Kong and English locales", () => {
    expect(formatItemRewardAmount(1234.5, "HK$", "zh-Hant")).toBe("HK$1,234.5");
    expect(formatItemRewardAmount(1000, "$", "en")).toBe("$1,000");
  });

  it("matches category chips using stored category first", () => {
    const wallet = item({ category: "wallet", title: "Phone" });
    expect(passesCategoryChip(wallet, "wallet")).toBe(true);
    expect(passesCategoryChip(wallet, "electronics")).toBe(false);
    expect(passesCategoryChip(wallet, "all")).toBe(true);
  });

  it("excludes undated items only when an occurred range is active", () => {
    const undated = item({ occurredAt: null });
    expect(itemMatchesOccurredRange(undated, null, null)).toBe(true);
    expect(
      itemMatchesOccurredRange(undated, "2026-06-01T00:00:00.000Z", null),
    ).toBe(false);
  });

  it("checks occurred date bounds inclusively", () => {
    const target = item({ occurredAt: "2026-06-10T12:00:00.000Z" });
    expect(
      itemMatchesOccurredRange(
        target,
        "2026-06-10T00:00:00.000Z",
        "2026-06-11T00:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      itemMatchesOccurredRange(target, "2026-06-11T00:00:00.000Z", null),
    ).toBe(false);
  });

  it("matches search geo only when coordinates are inside the radius", () => {
    const central = item({
      locationLatitude: 22.281,
      locationLongitude: 114.158,
    });
    expect(itemMatchesSearchGeo(central, null, null, null)).toBe(true);
    expect(itemMatchesSearchGeo(central, 22.281, 114.158, 10)).toBe(true);
    expect(itemMatchesSearchGeo(central, 22.3193, 114.1694, 100)).toBe(false);
    expect(
      itemMatchesSearchGeo(
        item({ locationLatitude: null, locationLongitude: null }),
        22.281,
        114.158,
        1000,
      ),
    ).toBe(false);
  });
});
