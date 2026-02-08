# Glazki TV - Internet TV Player

A modern, high-performance Internet TV player built with **React Native** and **Expo**.

## Features

- 📺 **Channel Browsing**: Browse thousands of channels categorized by group.
- 🔍 **Search**: Find channels quickly by name.
- ❤️ **Favorites**: Save your favorite channels for quick access (persisted locally).
- 🔗 **Deep Linking & Sharing**: Share direct links to channels that open automatically.
    - Example: `/?channel=Russia 1` works on web!
- 🌓 **Theme Support**: Automatically adapts to system light/dark mode.
- 🌐 **Web Support**: Fully functional on the web with URL synchronization.
    - Interactive preview mode prevents autoplay issues.

## Tech Stack

- **Framework**: React Native + Expo
- **Video Player**: `expo-video` (replaces deprecated `expo-av`)
- **UI Toolkit**: `react-native-paper`
- **Playlist Parser**: `iptv-playlist-parser`
- **Routing**: Custom tab navigation + `expo-linking`

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run on Web**:
   ```bash
   npm run web
   ```
   Open [http://localhost:8081](http://localhost:8081) to view it in the browser.

3. **Run on Mobile**:
   ```bash
   npm run android
   # or
   npm run ios
   ```

