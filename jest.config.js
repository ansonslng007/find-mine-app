module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/components/**/*.test.ts", "<rootDir>/lib/**/*.test.ts"],
  collectCoverageFrom: [
    "components/notifications/format-notification-time.ts",
    "components/lost-items/format.ts",
    "lib/auth/map-biometric-error.ts",
    "lib/item-platform.ts",
    "lib/nominatim-readable-address.ts",
    "lib/places-geometry.ts",
  ],
};
