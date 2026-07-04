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
npm run start
```

`npm run start` starts Expo, clears the cache, and uses the deployed cloud backend.

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

## Notes

- API URL selection is in `lib/api/base-url.ts`.
- Build profiles are in `eas.json`.
- App config is in `app.json` and `app.config.ts`.
