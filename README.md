This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Builds and the API address

**The backend a build talks to is decided by the build type, not by a flag you
pass.** There is nothing to remember and nothing to set:

| Build | API base URL |
| --- | --- |
| Debug (`yarn ios`, `yarn android`, running from Xcode or Android Studio) | `http://localhost:8000/api/v1` on iOS, `http://10.0.2.2:8000/api/v1` on Android — the machine running Metro |
| Release (any of the commands below, **and** Xcode's Product ▸ Archive, **and** Android Studio's signed bundle) | `https://jaity.app/api/v1` |

This is keyed on `__DEV__`, which the bundler sets from the build type, so a
release build pointing at a laptop cannot be produced — including from the IDEs,
which is where TestFlight archives and signed bundles actually come from and
which is exactly what an `.env`-plus-npm-script scheme would not have covered.
`src/config/api.ts` is the only place the address lives, and
`src/config/api.test.ts` fails the suite if a non-dev build could ever resolve to
`localhost`, `10.0.2.2` or plain http.

To point a **development** build at some other backend (a tunnel, a staging
box), edit the URL in `src/config/api.ts` — the same way `AD_REWARD_ENABLED` in
`src/config/features.ts` is edited. It is deliberate that this takes a code
change: it is rare, local, and must never be the mechanism that decides what a
shipped build talks to.

## Release builds

```sh
yarn build:android:release    # APK  -> android/app/build/outputs/apk/release
yarn bundle:android:release   # AAB  -> android/app/build/outputs/bundle/release
yarn build:ios:release        # Release build onto the simulator/device
```

For a store build, Xcode (Product ▸ Archive) and Android Studio work too and
pick up the same address, which is the point.

> Android release is still signed with the debug keystore (the template
> default). That blocks Play distribution and is tracked separately (#26,
> keystore + signing + Play Internal) — it is not something this configuration
> changes.


# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
