# TUNG mobile app

Expo SDK 57 app (iOS, Android, web) using Expo Router and the Firebase JS SDK. Runs in **Expo Go**:
there are no `ios/` or `android/` folders and no native code.
Product spec: `../docs/TUNG_Product_and_Technical_Specification.md`.

## Run

```sh
npm install
npm start              # scan the QR code with Expo Go (SDK 57)
```

## Firebase

- Project `tung-c01e2`. The web app config lives in `.env` (`EXPO_PUBLIC_FIREBASE_*`).
- Firebase files (rules, functions, emulator config) live in the repo root.
- Local emulators: run `npm run emulators`, then create `.env.local` with
  `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` and `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=<your computer's LAN IP>`,
  and restart Metro with `npx expo start -c`.

## Checks

```sh
npm run typecheck
npm run lint
```

## Structure

- `src/app/` routes (Expo Router)
- `src/components/ui/` design-system components
- `src/theme/` colours, typography, spacing
- `src/lib/firebase.ts` Firebase instances and emulator wiring
- `src/features/` feature modules
