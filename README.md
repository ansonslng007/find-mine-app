# Find Mine App

Expo React Native app for Find Mine.

## Setup

```bash
npm install
```

The app uses `.env` for public Expo config:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_CLOUD_API_BASE_URL=https://your-cloud-backend-url
```

## Run

Start with the cloud backend:

```bash
npm start
```

`npm start` starts Expo, clears the cache, and uses the deployed cloud backend.

Use tunnel mode only when LAN mode is not enough:

```bash
npm run start:tunnel
```

Run native targets:

```bash
npm run android
npm run ios
```

Web is not a supported app target.

## Build

Build Android APK locally with the EAS preview profile:

```bash
npm run build:apk
```

Cloud build alternative:

```bash
npx eas build -p android --profile preview
```

Production build:

```bash
npx eas build -p android --profile production
```

## Scripts

| Script                  | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm start`             | Start Expo with cloud backend and clear cache.                                       |
| `npm run start:tunnel`  | Start Expo through tunnel mode when LAN mode is not enough.                          |
| `npm run android`       | Run Android native development build.                                                |
| `npm run ios`           | Run iOS native development build.                                                    |
| `npm run web`           | Start Expo web for quick development checks only. Web is not a supported app target. |
| `npm run build:apk`     | Build local Android APK.                                                             |
| `npm run lint`          | Run lint checks.                                                                     |
| `npm test`              | Run tests.                                                                           |
| `npm run test:coverage` | Run tests with coverage.                                                             |

## Notes

- API URL selection is in `lib/api/base-url.ts`.
- Build profiles are in `eas.json`.
- App config is in `app.json` and `app.config.ts`.
