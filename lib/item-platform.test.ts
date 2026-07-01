import { describe, expect, it } from "@jest/globals";

import {
  formatItemPlatformTag,
  formatPlatformTag,
  getEffectiveItemPlatform,
  isFacebookImport,
  ITEM_PLATFORM_FACEBOOK,
  platformLabelKey,
} from "./item-platform";

const t = (key: string) =>
  ({
    "platform.facebook": "Facebook",
  })[key] ?? key;

describe("item platform helpers", () => {
  it("uses explicit platform before source URL fallback", () => {
    expect(
      getEffectiveItemPlatform({
        platform: "custom",
        sourcePostUrl: "https://facebook.com/groups/example/posts/1",
      }),
    ).toBe("custom");
  });

  it("falls back to facebook when an imported source URL exists", () => {
    expect(
      getEffectiveItemPlatform({
        platform: null,
        sourcePostUrl: "https://facebook.com/groups/example/posts/1",
      }),
    ).toBe(ITEM_PLATFORM_FACEBOOK);
  });

  it("returns translated tags only for known platforms", () => {
    expect(platformLabelKey("facebook")).toBe("platform.facebook");
    expect(formatPlatformTag("facebook", t)).toBe("Facebook");
    expect(formatPlatformTag("unknown", t)).toBe(null);
  });

  it("detects Facebook imports only when source URL is present", () => {
    expect(
      formatItemPlatformTag(
        { platform: null, sourcePostUrl: "https://facebook.com/post/1" },
        t,
      ),
    ).toBe("Facebook");
    expect(
      isFacebookImport({
        platform: "facebook",
        sourcePostUrl: "https://facebook.com/post/1",
      }),
    ).toBe(true);
    expect(isFacebookImport({ platform: "facebook" })).toBe(false);
  });
});
