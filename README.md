# Dean Gardner – Integrix React Native (CLI)

React Native **CLI** (no Expo) version of the Integrix app. Same API and auth flow as the web app.

## Stack

- **React Native** 0.84 + TypeScript
- **React Navigation** (native-stack, bottom-tabs)
- **Redux Toolkit** (auth slice, async thunks)
- **Axios** (baseURL from config, Bearer token, 401 → sign out)
- **react-native-keychain** (secure JWT storage)

## API

- Base URL: `https://api.integri-x.com/` (see `src/config.ts`)
- Auth: sign-in, get-userdata, sign-out (see `src/api/auth.ts`)

## Run

```bash
npm start
# In another terminal:
npm run ios     # or: npx react-native run-ios
npm run android # or: npx react-native run-android
```

### iOS (first time)

```bash
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios
```

## Project structure

- `src/config.ts` – API base URL
- `src/api/` – axios instance, auth API
- `src/storage/tokenStorage.ts` – secure token via react-native-keychain
- `src/store/` – Redux store, auth slice
- `src/screens/` – SignInScreen, FeedScreen
- `src/navigation/RootNavigator.tsx` – Auth stack vs App tabs
- `App.tsx` – Provider, loadUser, 401 callback, NavigationContainer

## Auth flow

1. On launch, `loadUser()` runs (token from keychain → get-userdata).
2. No token or invalid → show Sign in.
3. Sign in → POST sign-in → store token → get-userdata → show Feed.
4. 401 from any API → clear token, setUnauthorized → show Sign in.
5. Sign out → POST sign-out, remove token → show Sign in.
